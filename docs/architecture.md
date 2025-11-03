## Architecture

### Front-end
- React SPA

### Api
- Typescript api

### Event store
- KurrentDB

### Event stream (broker)
- Kafka

### Projection database
- Postgres

### Projection application
- Typescript

## Flow
### Create resource
- FE to API
- API to ES
- API to FE (Accepted)
- ES to Kafka
- Kafka to ProjApp
- ProjApp to ProjDB

### Read resource
- FE to API
- API to ReadDB
- ReadDB to API
- API to FE

### Update resource
- FE to API
- API to ES
- API to FE (Accepted)
- ES to Kafka
- Kafka to ProjApp
- ProjApp to ProjDB

### Delete resource
- FE to API
- API to ES
- API to FE (Accepted)
- ES to Kafka
- Kafka to ProjApp
- ProjApp to ProjDB
