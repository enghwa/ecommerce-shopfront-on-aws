#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { WordpressLabStack } from '../lib/wordpress-lab-stack';

const app = new cdk.App();
new WordpressLabStack(app, 'WordpressLabStack');
