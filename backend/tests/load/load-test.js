import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Metrics
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    constant_request_rate: {
      executor: 'constant-arrival-rate',
      rate: 1000,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 1000,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    errors: ['rate<0.01'], // error rate should be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const API_URL = `${BASE_URL}/api/v1`;

const queries = {
  projects: `
    query GetProjects($skip: Int, $take: Int) {
      projects(skip: $skip, take: $take) {
        projects {
          id
          title
          description
          category
          status
          goal
          currentFunds
        }
        total
      }
    }
  `,
  activeProjects: `
    query GetActiveProjects($limit: Int) {
      activeProjects(limit: $limit) {
        id
        title
        category
        currentFunds
        goal
      }
    }
  `,
  projectDetails: `
    query GetProject($id: String!) {
      project(id: $id) {
        id
        title
        description
        category
        status
        goal
        currentFunds
        deadline
        creatorId
        _count {
          contributions
          milestones
        }
      }
    }
  `,
};

export default function () {
  const weightedRandom = Math.random();
  let res;

  if (weightedRandom < 0.4) {
    // 40% Traffic: List projects
    res = http.post(GRAPHQL_URL, JSON.stringify({
      query: queries.projects,
      variables: { skip: 0, take: 20 },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (weightedRandom < 0.7) {
    // 30% Traffic: Active projects
    res = http.post(GRAPHQL_URL, JSON.stringify({
      query: queries.activeProjects,
      variables: { limit: 10 },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (weightedRandom < 0.9) {
    // 20% Traffic: Search projects
    res = http.get(`${API_URL}/project/search/projects?q=fund&limit=10`);
  } else {
    // 10% Traffic: Project details (using a placeholder ID if none provided)
    const projectId = __ENV.PROJECT_ID || 'cm1234567890';
    res = http.post(GRAPHQL_URL, JSON.stringify({
      query: queries.projectDetails,
      variables: { id: projectId },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'no graphql errors': (r) => {
      if (r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json')) {
        const body = JSON.parse(r.body);
        return !body.errors;
      }
      return true;
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  sleep(0.1);
}
