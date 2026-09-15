import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { request } from './helpers';

// The API returns StoredFavorite objects; videoId is the catalog video identifier.
