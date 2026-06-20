import { OpenAPIHono, createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../middleware/auth';
import { guard } from '../middleware/guard';
import { createWorkflowSavedViewSchema, updateWorkflowSavedViewSchema } from '@zenith/shared';
import { ErrorResponse, jsonContent, validationHook, commonErrorResponses, ok, okMsg, IdParam, okBody } from '../lib/openapi-schemas';
import { WorkflowSavedViewDTO } from '../lib/openapi-dtos';
import { listSavedViews, createSavedView, updateSavedView, deleteSavedView } from '../services/workflow-saved-views.service';

const router = new OpenAPIHono({ defaultHook: validationHook });

const listRoute = defineOpenAPIRoute({
  route: createRoute({
    method: 'get', path: '/', tags: ['WorkflowSavedViews'], summary: '保存视图列表',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'workflow:instance:list' })] as const,
    request: { query: z.object({ pageKey: z.string().min(1) }) },
    responses: { ...commonErrorResponses, ...ok(z.array(WorkflowSavedViewDTO), 'ok') },
  }),
  handler: async (c) => c.json(okBody(await listSavedViews(c.req.valid('query').pageKey)), 200),
});

const createRouteDef = defineOpenAPIRoute({
  route: createRoute({
    method: 'post', path: '/', tags: ['WorkflowSavedViews'], summary: '保存视图',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'workflow:instance:list' })] as const,
    request: { body: { content: jsonContent(createWorkflowSavedViewSchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(WorkflowSavedViewDTO, '已保存') },
  }),
  handler: async (c) => c.json(okBody(await createSavedView(c.req.valid('json')), '已保存'), 200),
});

const updateRouteDef = defineOpenAPIRoute({
  route: createRoute({
    method: 'put', path: '/{id}', tags: ['WorkflowSavedViews'], summary: '更新视图',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'workflow:instance:list' })] as const,
    request: { params: IdParam, body: { content: jsonContent(updateWorkflowSavedViewSchema), required: true } },
    responses: { ...commonErrorResponses, ...ok(WorkflowSavedViewDTO, '已更新'), 404: { content: jsonContent(ErrorResponse), description: '不存在' } },
  }),
  handler: async (c) => c.json(okBody(await updateSavedView(c.req.valid('param').id, c.req.valid('json')), '已更新'), 200),
});

const deleteRouteDef = defineOpenAPIRoute({
  route: createRoute({
    method: 'delete', path: '/{id}', tags: ['WorkflowSavedViews'], summary: '删除视图',
    security: [{ BearerAuth: [] }],
    middleware: [authMiddleware, guard({ permission: 'workflow:instance:list' })] as const,
    request: { params: IdParam },
    responses: { ...commonErrorResponses, ...okMsg('已删除'), 404: { content: jsonContent(ErrorResponse), description: '不存在' } },
  }),
  handler: async (c) => {
    await deleteSavedView(c.req.valid('param').id);
    return c.json(okBody(null, '已删除'), 200);
  },
});

router.openapiRoutes([listRoute, createRouteDef, updateRouteDef, deleteRouteDef] as const);

export default router;
