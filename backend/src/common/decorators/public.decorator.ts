import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Opt a single route out of the guards applied at the class level. Used for the
// SSE stream endpoint, which authenticates via a `?token=` query param instead
// of the Bearer header the JwtAuthGuard reads. There is otherwise no global
// guard in this codebase — guards are opted *in* per controller.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
