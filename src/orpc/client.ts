import { createRouterClient } from '@orpc/server'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { createIsomorphicFn } from '@tanstack/react-start'

import type { RouterClient } from '@orpc/server'

import { auth } from '#/features/auth/auth'
import router from '#/orpc/router'

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: async () => {
        const headers = getRequestHeaders()
        const session = await auth.api.getSession({ headers })
        return { session }
      },
    }),
  )
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
    })
    return createORPCClient(link)
  })

export const client: RouterClient<typeof router> = getORPCClient()

export const orpc = createTanstackQueryUtils(client)
