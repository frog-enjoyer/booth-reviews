import { Hono } from 'hono';

import { fail } from '../response';
import type { AppBindings } from '../types';

export const moderationRoutes = new Hono<AppBindings>();

moderationRoutes.get('/reports', (c) => {
  return c.json(fail('NOT_IMPLEMENTED', 'Admin moderation UI is not implemented yet'), 501);
});
