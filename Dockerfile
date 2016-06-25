FROM warehaus/base-image:v14

RUN mkdir -p /var/log/runny
VOLUME /var/log/runny

COPY . /opt/runny

RUN cd /opt/runny/backend && npm link
RUN ln -s /opt/runny/bin/runny /usr/local/bin/runny

EXPOSE 80

CMD ["runny"]
