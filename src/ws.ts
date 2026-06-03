/**
 * canopy-crypto/ws
 *
 * WebSocket transport layer for connecting to a Canopy node.
 * DirectTransport connects directly; PortalTransport proxies through a parent frame.
 */

export type { GameTransport, DirectTransportConfig } from "./transport.js";
export { DirectTransport, PortalTransport, createTransport } from "./transport.js";
