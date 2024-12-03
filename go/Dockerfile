FROM chromedp/headless-shell:latest
RUN apt-get update && apt-get install -y \
    wget \
    tar \
    gcc \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*
ENV GO=1.23.3
RUN wget https://go.dev/dl/go${GO}.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go${GO}.linux-amd64.tar.gz && \
    rm go${GO}.linux-amd64.tar.gz

ENV PATH=$PATH:/usr/local/go/bin
ENV GO111MODULE=on
WORKDIR /app
COPY go.mod go.sum main.go /app/
RUN go get ./... \
    && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-w -s" -o /app/parse-image .
RUN chmod +x /app/parse-image
ENTRYPOINT [ "/app/parse-image" ]
