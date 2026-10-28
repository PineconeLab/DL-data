begin;
create function public.save_settings(p_name text,p_met_on date,p_anniversary date,p_cities jsonb) returns void language plpgsql security definer set search_path='' as $$
declare sid uuid; c jsonb;
begin
 select space_id into sid from public.space_members where user_id=auth.uid();
 if sid is null then raise exception 'NOT_MEMBER'; end if;
 if jsonb_typeof(p_cities)<>'array' or jsonb_array_length(p_cities)>2 then raise exception 'INVALID_CITIES'; end if;
 update public.spaces set name=trim(p_name),met_on=p_met_on,anniversary=p_anniversary where id=sid;
 for c in select * from jsonb_array_elements(p_cities) loop
 update public.space_members set city=c->>'city' where id=(c->>'member_id')::uuid and space_id=sid;
 if not found then raise exception 'NOT_MEMBER'; end if;
 end loop;
end $$;
revoke all on function public.save_settings(text,date,date,jsonb) from public,anon,authenticated;
grant execute on function public.save_settings(text,date,date,jsonb) to authenticated;
commit;
