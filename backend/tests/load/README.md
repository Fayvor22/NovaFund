# NovaFund Backend Load Testing

This directory contains the load testing suite for the NovaFund backend, designed to ensure the system can handle high-traffic events like the "Stellar Drip" wave.

## Target
- **Throughput**: 1000 requests/second.
- **Latency**: 95% of requests < 500ms.
- **Error Rate**: < 1%.

## Prerequisites
- [k6](https://k6.io/docs/getting-started/installation/) must be installed on your machine.

## Running the Tests

### 1. Adjust Rate Limits
Ensure the backend is configured to allow high traffic. You can adjust these in your `.env` file:
```env
THROTTLE_TTL=60000
THROTTLE_LIMIT=100000
THROTTLE_AGGREGATE_LIMIT=50000
```

### 2. Run k6
You can run the test using the npm script from the `backend` directory:
```bash
npm run test:load
```

Or run k6 directly with environment variables:
```bash
k6 run -e BASE_URL=https://staging-api.novafund.com -e PROJECT_ID=your-project-id tests/load/load-test.js
```

## Test Scenarios
The script simulates a realistic mix of traffic:
- **40%**: Listing projects (GraphQL `projects` query).
- **30%**: Fetching active projects (GraphQL `activeProjects` query).
- **20%**: Searching projects (REST `GET /search/projects` endpoint).
- **10%**: Viewing project details (GraphQL `project` query).

## Monitoring
Watch for the following metrics in the k6 output:
- `http_req_duration`: End-to-end request time.
- `errors`: Percentage of failed requests or GraphQL errors.
- `iterations`: Total number of successful test cycles.
