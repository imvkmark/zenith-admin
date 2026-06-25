import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { guard } from '../middleware/guard';
import { commonErrorResponses, ok, okBody, validationHook } from '../lib/openapi-schemas';
import { WorkflowEngineIntrospectionDTO } from '../lib/openapi-dtos';
import { getWorkflowEngineIntrospection } from '../services/workflow-engine-introspection.service';

const router = new OpenAPIHono({ defaultHook: validationHook });

const introspectionRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get',
    path: '/introspection',
    tags: ['WorkflowEngine'],
    summary: '流程引擎内部状态内省',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'workflow:instance:monitor' })] as const,
    request: {
      query: z.object({
        thresholdMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
      }),
    },
    responses: { ...commonErrorResponses, ...ok(WorkflowEngineIntrospectionDTO, '流程引擎内部状态快照') },
  }),
  handler: async (c) => {
    const { thresholdMinutes } = c.req.valid('query');
    return c.json(okBody(await getWorkflowEngineIntrospection(thresholdMinutes ?? 30)), 200);
  },
});

router.openapiRoutes([introspectionRoute] as const);

export default router;
