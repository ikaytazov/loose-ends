-- Security advisor: pin the search_path of the trigger function.
alter function public.tasks_touch() set search_path = '';
