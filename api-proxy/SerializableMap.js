export default class SerializableMap extends Map {
  static fromObj(o) {
    if (o === null) {
      return o;
    }

    if (typeof o === "object") {
      if (Array.isArray(o)) {
        return o.map(SerializableMap.fromObj);
      }
      const m = new SerializableMap();

      for (const [key, value] of Object.entries(o)) {
        if (Array.isArray(value)) {
          m.set(key, value.map(SerializableMap.fromObj));
        } else if (typeof value === "object") {
          m.set(key, SerializableMap.fromObj(value));
        } else {
          m.set(key, value);
        }
      }
      return m;
    }
    return o;
  }

  toJSON() {
    const o = {};
    for (const [key, value] of this.entries()) {
      const realKey = key.toJSON
        ? key.toJSON()
        : key.toString
          ? key.toString()
          : key;
      o[realKey] = value;
    }
    return o;
  }
}
