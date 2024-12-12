/**
 * AlertsCache
 * -----------------------------------
 * Serves as the interface into the alerts cache database table,
 * where active alerts and their geometries are stored.
 * To avoid potential memory conflicts in the threaded environment,
 * actual alert data is not stored on this object and methods are
 * mostly immufable.
 * Consumers can use multiple instances of this object to read vs write
 * to the cache table.
 */
export class AlertsCache {
  constructor(tableName="weathergov_geo_alerts_cache", dbConnection){
    this.db = dbConnection;
    this.tableName = tableName;

    // Bound methods
    this.getHashes = this.getHashes.bind(this);
    this.determineOldHashesFrom = this.determineOldHashesFrom.bind(this);
    this.removeByHashes = this.removeByHashes.bind(this);
    this.removeInvalidBasedOn = this.removeInvalidBasedOn.bind(this);
  }

  async createTable(){
    const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (
id INT AUTO_INCREMENT,
hash TEXT NOT NULL,
alertJson JSON NOT NULL,
shape GEOMETRY NOT NULL,
PRIMARY KEY(id)
) DEFAULT CHARSET=utf8mb4`;
    return await this.db.query(sql);
  }

  async getHashes(){
    const sql = `SELECT hash FROM ${this.tableName};`;
    const [ result, _ ] = await this.db.query(sql);
    return result;
  }

  /**
   * Given an array of current hashes and an array of incoming
   * hashes, return a list of hashes from the current set that are
   * not in the incoming set.
   * This is how we determine old/invalid hashes during an
   * all active alerts request.
   * NOTE: node does not yet have standardized Set methods
   * for determining difference, so we can't do the "normal"
   * thing here and use Sets
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/difference
   */
  determineOldHashesFrom(currentHashes, incomingHashes){
    return currentHashes.filter(currentHash => {
      return !incomingHashes.includes(currentHash);
    });
  }

  /**
   * Given an array of current hashes and an array of incoming
   * hashes, return a list of hashes from the incoming set that
   * are not in the current set.
   * This is how we determine new hashes during an all active
   * alerts request, and how we know which alerts are new.
   * NOTE: node does not yet have standardized Set methods
   * for determining difference, so we can't do the "normal"
   * thing here and use Sets
   * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/difference
   */
  determineNewHashesFrom(currentHashes, incomingHashes){
    return incomingHashes.filter(incomingHash => {
      return !currentHashes.includes(incomingHash);
    });
  }

  /**
   * Remove rows from the cache table by hash.
   * If the argument is a list, we assume a list of hashes.
   */
  async removeByHashes(aHashList){
    if(!aHashList.length){
      return [];
    }
    let whereClause = `hash='${aHashList[0]}';`;
    if(aHashList.length > 1){
      const marks = aHashList.map(() => "?").join(", ");
      whereClause = `hash IN (${marks});`;
    }
    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    return await this.db.query(sql, aHashList);
  }

  /**
   * Given an array of incoming hashes, determine which
   * from the current cache table are no longer valid and remove
   * them from the table.
   */
  async removeInvalidBasedOn(incomingHashes){
    const currentHashes = await this.getHashes();
    const invalidHashes = this.determineOldHashesFrom(currentHashes, incomingHashes);
    return await this.removeByHashes(invalidHashes);
  }

  /**
   * Add the provided hash, geometry, and alert data to the
   * cache table.
   */
  async add(hash, alert, geometry){
    const alertAsString = JSON.stringify(alert);
    const geometryAsString = JSON.stringify(geometry);
    const sql = `INSERT INTO ${this.tableName} (hash, alertJson, shape) VALUES(?, ?, ST_GeomFromGeoJson(?));`;
    return await this.db.query(sql, [hash, alertAsString, geometryAsString]);
  }
}

