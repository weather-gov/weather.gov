/**
 * Tool for tracking open connections across all
 * of our undici shared pools.
 * This object can be used by the interop responses
 * when determining whether or not to respond with
 * a 429
 */
import connectionPool from "./data/connectionPool.js";
import {requestPool as satellitePool } from "./data/satellite.js";

// We assume a hard-coded default of 16k
// This can (and perhaps should) be speficied
// from the environment variable instead, which
// we check below
let MAX_OPEN_CONNECTIONS = 16_000;
if(process.env.MAX_OPEN_CONNECTIONS){
  const num = parseInt(process.env.MAX_OPEN_CONNECTIONS);
  if(Number.isInteger(num)){
    MAX_OPEN_CONNECTIONS = num;
  }
}

export default {
  pools: [connectionPool, satellitePool],
  maxConnections: MAX_OPEN_CONNECTIONS,

  get currentSize(){
    return this.pools.reduce((total, pool) => {
      return total + pool.stats.size;
    }, 0);
  },
  
  get atMax(){
    return this.currentSize >= this.maxConnections;
  }
};
