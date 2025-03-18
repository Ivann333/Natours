'use strict';

class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  applyQueryFilters() {
    let queryObj = { ...this.queryString };
    const exclude = ['page', 'sort', 'limit', 'fields'];
    exclude.forEach(item => delete queryObj[item]);

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr
      .replaceAll('"gte"', '"$gte"')
      .replaceAll('"lte"', '"$lt"')
      .replaceAll('"gt"', '"$gt"')
      .replaceAll('"lt"', '"$lt"');

    this.query.find(JSON.parse(queryStr));
    return this;
  }
  sort() {
    if (this.queryString.sort) {
      this.query = this.query.sort(this.queryString.sort.replaceAll(',', ' '));
    } else {
      this.query = this.query.sort('-price');
    }
    return this;
  }
  limitFields() {
    if (this.queryString.fields) {
      this.query = this.query.select(
        this.queryString.fields.replaceAll(',', ' ')
      );
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }
  paginate() {
    const limit = this.queryString.limit || 5;
    const page = this.queryString.page || 1;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
