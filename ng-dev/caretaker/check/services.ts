/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import fetch from 'node-fetch';

import {bold, Log} from '../../utils/logging.js';
import {BaseModule} from './base.js';

interface ServiceConfig {
  name: string;
  url: string;
}

/**
 * Status HTTP responses which are commonly used by services like GitHub.
 * See for example: https://www.githubstatus.com/api.
 */
interface StatusHttpResponse {
  page: {
    updated_at: string;
  };
  status: {
    description: string;
    indicator: 'none' | 'minor' | 'major' | 'critical';
  };
}

/** The results of checking the status of a service */
interface StatusCheckResult {
  name: string;
  status: 'passing' | 'failing';
  description: string;
  lastUpdated: Date;
}

/** List of services Angular relies on. */
export const services: ServiceConfig[] = [
  {
    url: 'https://status.us-west-1.saucelabs.com/api/v2/status.json',
    name: 'Saucelabs',
  },
  {
    url: 'https://status.npmjs.org/api/v2/status.json',
    name: 'Npm',
  },
  {
    url: 'https://status.circleci.com/api/v2/status.json',
    name: 'CircleCi',
  },
  {
    url: 'https://www.githubstatus.com/api/v2/status.json',
    name: 'Github',
  },
];

export class ServicesModule extends BaseModule<StatusCheckResult[]> {
  override async retrieveData() {
    return Promise.all(services.map((service) => this.getStatusFromStandardApi(service)));
  }

  override async printToTerminal() {
    const statuses = await this.data;
    const serviceNameMinLength = Math.max(...statuses.map((service) => service.name.length));
    Log.info.group(bold('Service Statuses'));
    for (const status of statuses) {
      const name = status.name.padEnd(serviceNameMinLength);
      if (status.status === 'passing') {
        Log.info(`${name} ✅`);
      } else {
        Log.info.group(`${name} ❌ (Updated: ${status.lastUpdated.toLocaleString()})`);
        Log.info(`  Details: ${status.description}`);
        Log.info.groupEnd();
      }
    }
    Log.info.groupEnd();
    Log.info();
  }

  /** Retrieve the status information for a service which uses a standard API response. */
  async getStatusFromStandardApi(service: ServiceConfig): Promise<StatusCheckResult> {
    const result = (await fetch(service.url).then((r) => r.json())) as StatusHttpResponse;
    const status = result.status.indicator === 'none' ? 'passing' : 'failing';
    return {
      name: service.name,
      status,
      description: result.status.description,
      lastUpdated: new Date(result.page.updated_at),
    };
  }
}
