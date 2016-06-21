FROM node:6.2

RUN mkdir -p /var/log/runny
VOLUME /var/log/runny

COPY . /opt/runny

RUN cd /opt/runny/backend && npm link
RUN ln -s /opt/runny/bin/runny /usr/local/bin/runny

EXPOSE 80

CMD ["runny"]
