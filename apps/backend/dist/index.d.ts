import { Express } from 'express';
import { OptimizedCacheService } from './services/cache.service.optimized';
import { websocketService } from './services/websocket.service';
declare const app: Express;
declare const cacheService: OptimizedCacheService;
export default app;
export { cacheService, websocketService };
//# sourceMappingURL=index.d.ts.map