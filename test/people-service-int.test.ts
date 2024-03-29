/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck


describe("People Service Int Test", () => {

  require("../src");
  const cds = require("@sap/cds");
  const { axios } = cds.test(".").in(__dirname, "./app");
  axios.defaults.validateStatus = () => true;
  const testPeopleID = "318da8b4-95be-498d-bae7-f0c6ed6516ac";

  beforeAll(async () => {
    jest.spyOn(cds.db, "run");
  });

  it("should support read metadata", async () => {
    const response = await axios.get("/odata/v4/people/$metadata");
    expect(response.data).toMatch(/EarthPeople/);
  });

  it("should support validate the length of Name", async () => {
    const response = await axios.post("/odata/v4/people/EarthPeoples", { "Name": "theo" });
    expect(response.status).toBe(500);
    expect(response.data.error.message).toBe("invalid name");
  });

  it("should support create a valid EarthPeople instance", async () => {
    const response = await axios.post("/odata/v4/people/EarthPeoples", {
      "ID": testPeopleID,
      "Name": "theo valid"
    });
    expect(response.status).toBe(201);
    expect(response.data).toMatchObject({
      "@odata.context": "$metadata#EarthPeoples/$entity",
      "Address": null,
      "Age": 18,
      "ID": testPeopleID,
      "Name": "theo valid",
      "Weight": 9999,
    });
    const getResponse = await axios.get(`/odata/v4/people/EarthPeoples(${testPeopleID})`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data).toMatchObject({
      "@odata.context": "$metadata#EarthPeoples/$entity",
      "Address": null,
      "Age": 18,
      "ID": testPeopleID,
      "Name": "theo valid",
      "Weight": 9999,
    });
  });

  it("should support update the Age of people", async () => {
    const response = await axios.patch(`/odata/v4/people/EarthPeoples(${testPeopleID})`, { Age: 99 });
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      ID: testPeopleID,
      Age: 99
    });
  });

  it("should support soft delete for EarthPeople", async () => {
    const response = await axios.delete(`/odata/v4/people/EarthPeoples(${testPeopleID})`);
    expect(response.status).toBe(204);
    // because setup the spy on the cds.db.run
    // so that, you can check the last call of the cds.db.run
    expect(cds.db.run.mock.lastCall).toMatchSnapshot();
    // verify
    const deletedQuery = await axios.get(`/odata/v4/people/EarthPeoples(${testPeopleID})`);
    expect(deletedQuery.status).toBe(404);
    const dbPeople = await cds.run(SELECT.one.from("db.EarthPeople", testPeopleID));
    expect(dbPeople).not.toBeNull();
  });

  it("should support cds API and validation", async () => {
    // you can use cds.xxx api here, and test framework directly
    const peopleService = await cds.connect.to("PeopleService");
    // you want to expect 'async' error
    await expect(async () => {
      await peopleService.run(INSERT.into("EarthPeoples").entries({
        Name: "Theo"
      }));
    }).rejects.toThrow("invalid name");
  });

  it("should support raise error when delete without query filter", async () => {
    const peopleService = await cds.connect.to("PeopleService");
    await expect(() => peopleService.run(DELETE.from("EarthPeoples")))
      .rejects
      .toThrow("internal server error");
  });

  it("should support snapshot test", async () => {
    const response = await axios.post("/odata/v4/people/EarthPeoples", {
      ID: "18f3dfbf-92e2-4e50-a14d-ca120fb3aff5",
      Name: "Theo for Snapshot"
    });
    expect(response.status).toBe(201);
    expect(response.data).toMatchSnapshot();
  });

});


