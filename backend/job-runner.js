#!/usr/bin/env node

const logger   = require('./logger');
const db       = require('./db');
const Bamboo   = require('./bamboo');
const moment   = require('moment');
const r        = require('rethinkdbdash')(db.config());
const schedule = require('node-schedule');

const ALL_ENVS = ['local', 'aws'];
const STATUS_IDLE = 'idle';
const STATUS_BUILDING = 'building';

const update_job = (job, update) => {
    return r.table('job').get(job.id).update(update).run().then(() => {
        logger.debug(`${job.id} [${job.name}]: Updated with ${JSON.stringify(update)}`);
    }).error(err => {
        logger.error(`${job.id} [${job.name}]: Error updating:`, err);
    });
};

const plan_status_update = (plan_key, plan_status) => {
    const status = {};
    status[plan_key] = plan_status;
    return { status };
};

const job_next_run_update = (job, now) => {
    const next_run = moment(now).add(job.interval, 'seconds').toDate();
    return { next_run };
};

const refresh_plan_status = (bamboo, job, plan_key) => {
    logger.debug(`${job.id} [${job.name}]: Refreshing status of ${plan_key}`);
    const plan = bamboo.plan(plan_key);
    return plan.isBuilding()
        .then(is_building => {
            const status = is_building ? STATUS_BUILDING : STATUS_IDLE;
            return update_job(job, plan_status_update(plan_key, status))
                .then(() => status);
        });
};

const refresh_job_status = (bamboo, job) => {
    logger.debug(`${job.id} [${job.name}]: Refreshing status of job`);
    return Promise.all(ALL_ENVS.map(env => {
        const plan_key = job[`${env}_key`];
        if (!plan_key) {
            return Promise.resolve(undefined);
        }
        return refresh_plan_status(bamboo, job, plan_key);
    }));
};

const get_allowed_envs = (bamboo, job) => {
    return ['local', 'aws'];
};

const run_job = (bamboo, job) => {
    const allowed_envs = get_allowed_envs(bamboo, job);
    for (var i = 0; i < allowed_envs.length; ++i) {
        const env = allowed_envs[i];
        const plan_key = job[`${env}_key`];
        if (!plan_key) {
            logger.info(`${job.id} [${job.name}]: No ${env}_key for this job`);
            continue;
        }
        logger.info(`${job.id} [${job.name}]: Running job`);
        const plan = bamboo.plan(plan_key);
        return plan.run()
            .then(() => {
                const update = Object.assign({ error: null },
                                             plan_status_update(plan_key, STATUS_BUILDING),
                                             job_next_run_update(job));
                return update_job(job, update);
            }).catch(err => {
                const update = { error: `Error running: ${JSON.stringify(err)}` };
                return update_job(job, update);
            });
    }
    logger.info(`${job.id} [${job.name}]: Wanted to run but could not find resources`);
    return Promise.resolve();
};

const check_needs_exec = (bamboo, job) => {
    if (job.disabled) {
        logger.debug(`${job.id} [${job.name}]: Skipping disabled job`);
        return Promise.resolve();
    }
    if (job.next_run) {
        var now = moment();
        var next_run = moment(job.next_run);
        if (now < next_run) {
            logger.debug(`${job.id} [${job.name}]: Due ${next_run.fromNow()}`);
            if (job.error) {
                return update_job(job, { error: null });
            }
            return Promise.resolve();
        }
    }
    return run_job(bamboo, job).catch(err => {
        logger.error(`${job.id} [${job.name}]: Error while running job:`, err);
    });
};

const maintain_job = (bamboo, job) => {
    logger.debug(`${job.id} [${job.name}]: Maintaining job`);
    return refresh_job_status(bamboo, job)
        .then(statuses => {
            if (statuses.filter(x => x === STATUS_BUILDING).length) {
                logger.info(`${job.id} [${job.name}]: Job is currently running`);
                return Promise.resolve();
            }
            return check_needs_exec(bamboo, job);
        })
        .catch(err => {
            logger.error(`${job.id} [${job.name}]: Error while maintaining job:`, err);
        });
};

const BAMBOO_URL      = process.env.BAMBOO_URL;
const BAMBOO_USERNAME = process.env.BAMBOO_USERNAME;
const BAMBOO_PASSWORD = process.env.BAMBOO_PASSWORD;
const BAMBOO_AUTH_URL = process.env.BAMBOO_AUTH_URL || BAMBOO_URL;

const maintain_jobs_execution = () => {
    logger.info('Checking which jobs need to run');
    const bamboo = new Bamboo(BAMBOO_URL, BAMBOO_USERNAME, BAMBOO_PASSWORD, BAMBOO_AUTH_URL);
    r.table('job').run().then(jobs => {
        logger.info(`Got ${jobs.length} jobs from database`);
        jobs.forEach(job => maintain_job(bamboo, job).catch(logger.error));
    }).error(err => {
        logger.error('Error getting jobs');
        logger.error(err);
    });
};

schedule.scheduleJob('*/1 * * * *', maintain_jobs_execution);
