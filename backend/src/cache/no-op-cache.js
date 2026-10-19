class NoOpCache {
  async get() { return null; }
  async set() {}
  async delete() {}
  async deleteMany() {}
  async invalidateByNamespace() {}
}

module.exports = { NoOpCache };
