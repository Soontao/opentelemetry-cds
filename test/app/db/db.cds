namespace db;

using {
  cuid,
  managed
} from '@sap/cds/common';

type CommonName : String(120);
type CommonAge : Integer default 18;

aspect softDeletable : {
  Deleted : Boolean default false;
}

aspect People {
  Name   : CommonName;
  Age    : CommonAge;
  Weight : Decimal;
}

entity EarthPeople : cuid, People, softDeletable {
  Address : String(500);
}

entity MoonPeople : cuid, People {

}
