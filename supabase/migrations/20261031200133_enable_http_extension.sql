-- Lets the database call the app over HTTP (used to run the notes-reader scorer from SQL).
create extension if not exists http with schema extensions;
