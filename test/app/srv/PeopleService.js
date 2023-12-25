/* eslint-disable @typescript-eslint/no-var-requires */
const cds = require("@sap/cds");

module.exports = class PeopleService extends cds.ApplicationService {

  async init() {
    this.before("CREATE", "EarthPeoples", this._validateEarthPeopleCreateion);
    this.after("READ", "EarthPeoples", this._transformEarthPeopleData);
    this.on("DELETE", "EarthPeoples", this._softDeletePeople);
    cds.spawn({ every: 1000 }, (tx) => {
      return tx.run(SELECT.one.from(this.entities.EarthPeoples));
    });
    await super.init();
  }

  /**
   * @param {import("@sap/cds/apis/services").Request} req
   * @param {Function} next
   */
  _softDeletePeople(req) {
    const whereCond = req.query?.DELETE?.from?.ref?.[0]?.where ?? req.query?.DELETE?.where;
    if (whereCond === undefined) {
      throw new Error("internal server error");
    }
    return cds.run(
      UPDATE.entity("db.EarthPeople")
        .where(whereCond)
        .with({ Deleted: true })
    );
  }

  /**
   * @param {import("@sap/cds/apis/services").Request} req
   */
  _validateEarthPeopleCreateion(req) {
    const { Name } = req.data;
    if (Name === undefined || Name?.length <= 5 || Name?.length >= 20) {
      throw new Error("invalid name");
    }
  }

  /**
   * 
   * @param {Array<any>|any} results 
   */
  _transformEarthPeopleData(results) {
    results = results instanceof Array ? results : [results];
    for (const item of results.filter(item => item !== null)) {
      if (item.Weight === undefined || item.Weight === null) {
        item.Weight = 9999;
      }
    }
  }
};
