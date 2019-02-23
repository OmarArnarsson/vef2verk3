CREATE TABLE applications (
    id serial primary key,
    name varchar(64) not null,
    email varchar(64) not null,
    phone  int,
    text varchar(1000),
    job varchar(16),
    processed boolean default false,
    created timestamp without time zone not null default current_timestamp,
    updated timestamp without time zone not null default current_timestamp
);

CREATE TABLE users (
  id serial primary key,
  name varchar(64) not null,
  email varchar(64) not null,
  username varchar(64) not null,
  password varchar(64) not null,
  admin boolean default false
);
