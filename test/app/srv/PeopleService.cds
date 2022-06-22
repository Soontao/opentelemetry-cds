using {db} from '../db/db';

service PeopleService {

  entity EarthPeoples as projection on db.EarthPeople excluding {
    Deleted
  } where Deleted = false;

  entity MoonPeoples  as projection on db.MoonPeople excluding {
    Weight
  };

  view EarthPeopleView as
    select from EarthPeoples {
      Name,
    }
    group by
      Age;

}
