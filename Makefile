PROJECT_ROOT := $(shell pwd)
DOCKER_IMAGE := runny/runny
DOCKER_RUN_CMDLINE := docker run -ti --rm
LOCAL_LOGS := $(shell echo ~/.runny/logs)

default:
	@echo "Please run a specific make target"

FRONTEND_BUILDER_IMAGE := node:6.2
RUN_FRONTEND_BUILDER_IMAGE := @$(DOCKER_RUN_CMDLINE) \
	--volume $(PROJECT_ROOT):/build \
	$(FRONTEND_BUILDER_IMAGE) /bin/sh -c
FRONTEND_INSTALL_CMD := npm install && ./node_modules/.bin/bower install --allow-root
FRONTEND_BUILD_CMD := ./node_modules/.bin/gulp

build-frontend:
	@echo "Building frontend..."
	@$(RUN_FRONTEND_BUILDER_IMAGE) "cd /build/frontend && $(FRONTEND_INSTALL_CMD) && $(FRONTEND_BUILD_CMD) build"

frontend:
	@$(RUN_FRONTEND_BUILDER_IMAGE) "cd /build/frontend && $(FRONTEND_INSTALL_CMD) && $(FRONTEND_BUILD_CMD)"

.PHONY: frontend

docker-image: build-frontend
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):dev .

push-docker-image: docker-image
	@docker login -e="$(DOCKER_EMAIL)" -u="$(DOCKER_USERNAME)" -p="$(DOCKER_PASSWORD)";
	@if [ ! -z "$(TRAVIS_TAG)" ]; then \
		echo "Tagging image: $(DOCKER_IMAGE):$(TRAVIS_TAG)"; \
		docker tag $(DOCKER_IMAGE):dev $(DOCKER_IMAGE):$(TRAVIS_TAG); \
		docker tag $(DOCKER_IMAGE):dev $(DOCKER_IMAGE):latest; \
		echo "Pushing image..."; \
		docker push $(DOCKER_IMAGE):$(TRAVIS_TAG); \
		docker push $(DOCKER_IMAGE):latest; \
	else \
		docker push $(DOCKER_IMAGE):dev; \
	fi

RUN_DEV_IMAGE := $(DOCKER_RUN_CMDLINE) \
	--link rethinkdb \
	--volume $(PROJECT_ROOT):/opt/runny \
	--volume $(LOCAL_LOGS):/var/log/runny \
	--publish 80:80 \
	--env RUNNY_DEV=1 \
	--env BAMBOO_URL="$(BAMBOO_URL)" \
	--env BAMBOO_AUTH_URL="$(BAMBOO_AUTH_URL)" \
	--env BAMBOO_USERNAME="$(BAMBOO_USERNAME)" \
	--env BAMBOO_PASSWORD="$(BAMBOO_PASSWORD)" \
	$(DOCKER_IMAGE):dev

run:
	@echo "Running..."
	@mkdir -p $(LOCAL_LOGS)
	echo $(RUN_DEV_IMAGE) runny

shell:
	@$(RUN_DEV_IMAGE) /bin/bash
