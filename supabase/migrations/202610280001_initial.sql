-- Execute once in Supabase SQL Editor or with supabase db push.
begin;
create extension if not exists pgcrypto with schema extensions;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nickname text not null default '' check (char_length(nickname)<=40),
 avatar_path text check (avatar_path is null or avatar_path = 'avatars/'||id::text||'/avatar.webp'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.spaces (
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 1 and 60),
 met_on date, anniversary date, created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(met_on is null or met_on >= date '1900-01-01'), check(anniversary is null or anniversary >= date '1900-01-01')
);
create table public.space_members (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 user_id uuid not null unique references public.profiles(id), city text not null default '' check(char_length(city)<=80),
 joined_at timestamptz not null default now(), unique(space_id,user_id)
);
create index space_members_space_idx on public.space_members(space_id);
create table public.space_invitations (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid not null references public.profiles(id), expires_at timestamptz not null,
 used_at timestamptz, used_by uuid references public.profiles(id), revoked_at timestamptz,
 created_at timestamptz not null default now(), check(expires_at > created_at)
);
create index invitations_space_idx on public.space_invitations(space_id);
create table public.meetings (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 date date not null check(date >= date '1900-01-01'), title text not null check(char_length(title) between 1 and 120),
 location text not null default '' check(char_length(location)<=160), notes text not null default '' check(char_length(notes)<=10000),
 status text not null check(status in ('planned','completed')),
 created_by uuid not null references public.profiles(id), updated_by uuid not null references public.profiles(id),
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index meetings_space_date_idx on public.meetings(space_id,date desc) where deleted_at is null;
create table public.meeting_activities (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 80), position integer not null check(position between 0 and 19),
 created_at timestamptz not null default now(), unique(meeting_id,position)
);
create table public.meeting_photos (
 id uuid primary key default gen_random_uuid(), meeting_id uuid not null references public.meetings(id) on delete cascade,
 space_id uuid not null references public.spaces(id), path text not null unique,
 original_name text not null default '' check(char_length(original_name)<=200),
 mime_type text not null default 'image/webp' check(mime_type='image/webp'),
 size_bytes integer not null default 0 check(size_bytes between 0 and 5242880),
 width integer check(width between 1 and 6000), height integer check(height between 1 and 6000),
 status text not null default 'pending' check(status in ('pending','ready','deleting')),
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 cleanup_error text, cleanup_checked_at timestamptz,
 check(path=space_id::text||'/'||meeting_id::text||'/'||id::text||'.webp')
);
create index photos_meeting_idx on public.meeting_photos(meeting_id);
create index photos_cleanup_idx on public.meeting_photos(space_id,status);
create table public.wishes (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 120), description text not null default '' check(char_length(description)<=5000),
 planned_date date check(planned_date is null or planned_date >= date '1900-01-01'),
 category text not null check(category in ('place','experience','routine','other')),
 completed_at timestamptz, created_by uuid not null default auth.uid() references public.profiles(id),
 updated_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index wishes_space_idx on public.wishes(space_id,created_at desc);
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger spaces_updated before update on public.spaces for each row execute function public.touch_updated_at();
create trigger meetings_updated before update on public.meetings for each row execute function public.touch_updated_at();
create trigger photos_updated before update on public.meeting_photos for each row execute function public.touch_updated_at();
create trigger wishes_updated before update on public.wishes for each row execute function public.touch_updated_at();
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id) values(new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
-- These bounded predicates avoid RLS recursion. No arbitrary query execution.
create function public.is_space_member(sid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.space_members where space_id=sid and user_id=(select auth.uid())); $$;
create function public.can_read_profile(uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select uid=(select auth.uid()) or exists(select 1 from public.space_members a join public.space_members b on a.space_id=b.space_id where a.user_id=(select auth.uid()) and b.user_id=uid); $$;
create function public.can_read_meeting(mid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.meetings where id=mid and deleted_at is null and public.is_space_member(space_id)); $$;
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_invitations enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_activities enable row level security;
alter table public.meeting_photos enable row level security;
alter table public.wishes enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.can_read_profile(id));
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy spaces_read on public.spaces for select to authenticated using(public.is_space_member(id));
create policy spaces_update on public.spaces for update to authenticated using(public.is_space_member(id)) with check(public.is_space_member(id));
create policy members_read on public.space_members for select to authenticated using(public.is_space_member(space_id));
create policy members_city on public.space_members for update to authenticated using(public.is_space_member(space_id)) with check(public.is_space_member(space_id));
-- Invitations intentionally have NO read policies or table privileges, including for members.
create policy meetings_read on public.meetings for select to authenticated using(deleted_at is null and public.is_space_member(space_id));
create policy activities_read on public.meeting_activities for select to authenticated using(public.can_read_meeting(meeting_id));
create policy photos_read on public.meeting_photos for select to authenticated using(public.is_space_member(space_id));
create policy wishes_read on public.wishes for select to authenticated using(public.is_space_member(space_id));
create policy wishes_insert on public.wishes for insert to authenticated with check(public.is_space_member(space_id) and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy wishes_update on public.wishes for update to authenticated using(public.is_space_member(space_id)) with check(public.is_space_member(space_id) and updated_by=(select auth.uid()));
create policy wishes_delete on public.wishes for delete to authenticated using(public.is_space_member(space_id));
revoke all on public.profiles,public.spaces,public.space_members,public.space_invitations,public.meetings,public.meeting_activities,public.meeting_photos,public.wishes from anon,authenticated;
grant select on public.profiles,public.spaces,public.space_members,public.meetings,public.meeting_activities,public.meeting_photos,public.wishes to authenticated;
grant update(nickname,avatar_path) on public.profiles to authenticated;
grant update(name,met_on,anniversary) on public.spaces to authenticated;
grant update(city) on public.space_members to authenticated;
grant insert(space_id,title,description,planned_date,category,completed_at,created_by,updated_by), update(title,description,planned_date,category,completed_at,updated_by),delete on public.wishes to authenticated;
-- Serialize all per-user membership changes as well as per-space capacity changes.
create function public.create_space(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.space_members where user_id=uid) then raise exception 'ALREADY_MEMBER'; end if;
 if char_length(trim(p_name)) not between 1 and 60 then raise exception 'INVALID_NAME'; end if;
 insert into public.spaces(name,created_by) values(trim(p_name),uid) returning id into sid;
 insert into public.space_members(space_id,user_id) values(sid,uid); return sid;
end $$;
create function public.issue_invitation(p_hash text) returns timestamptz language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid; expiry timestamptz:=now()+interval '48 hours';
begin
 select space_id into sid from public.space_members where user_id=uid;
 if sid is null then raise exception 'NOT_MEMBER'; end if;
 perform 1 from public.spaces where id=sid for update;
 if (select count(*) from public.space_members where space_id=sid)>=2 then raise exception 'SPACE_FULL'; end if;
 update public.space_invitations set revoked_at=now() where space_id=sid and used_at is null and revoked_at is null;
 insert into public.space_invitations(space_id,token_hash,created_by,expires_at) values(sid,p_hash,uid,expiry);
 return expiry;
end $$;
create function public.accept_invitation(p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); inv public.space_invitations; sid uuid;
begin
 if uid is null then raise exception 'AUTH_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if exists(select 1 from public.space_members where user_id=uid) then raise exception 'ALREADY_MEMBER'; end if;
 select space_id into sid from public.space_invitations where token_hash=p_hash;
 if sid is null then raise exception 'INVITATION_INVALID'; end if;
 perform 1 from public.spaces where id=sid for update;
 select * into inv from public.space_invitations where token_hash=p_hash for update;
 if inv.used_at is not null or inv.revoked_at is not null or inv.expires_at<=now() then raise exception 'INVITATION_INVALID'; end if;
 if (select count(*) from public.space_members where space_id=sid)>=2 then raise exception 'SPACE_FULL'; end if;
 insert into public.space_members(space_id,user_id) values(sid,uid);
 update public.space_invitations set used_at=now(),used_by=uid where id=inv.id;
 return sid;
end $$;
-- Belt-and-braces guard, including accidental SQL inserts outside these functions.
create function public.guard_member_capacity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.spaces where id=new.space_id for update;
 if (select count(*) from public.space_members where space_id=new.space_id)>=2 then raise exception 'SPACE_FULL'; end if;
 return new;
end $$;
create trigger member_capacity before insert on public.space_members for each row execute function public.guard_member_capacity();
create function public.save_meeting(p_id uuid,p_date date,p_title text,p_location text,p_notes text,p_status text,p_activities text[]) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid; mid uuid; uid uuid:=auth.uid();
begin
 select space_id into sid from public.space_members where user_id=uid;
 if sid is null then raise exception 'NOT_MEMBER'; end if;
 if coalesce(cardinality(p_activities),0)>20 then raise exception 'TOO_MANY_ACTIVITIES'; end if;
 if p_id is null then
 insert into public.meetings(space_id,date,title,location,notes,status,created_by,updated_by) values(sid,p_date,trim(p_title),p_location,p_notes,p_status,uid,uid) returning id into mid;
 else
 select id into mid from public.meetings where id=p_id and space_id=sid and deleted_at is null for update;
 if mid is null then raise exception 'NOT_FOUND'; end if;
 update public.meetings set date=p_date,title=trim(p_title),location=p_location,notes=p_notes,status=p_status,updated_by=uid where id=mid;
 delete from public.meeting_activities where meeting_id=mid;
 end if;
 insert into public.meeting_activities(meeting_id,title,position) select mid,trim(v),i-1 from unnest(p_activities) with ordinality as a(v,i);
 return mid;
end $$;
create function public.reserve_photo(p_meeting uuid,p_name text) returns public.meeting_photos language plpgsql security definer set search_path='' as $$
declare m public.meetings; pid uuid:=gen_random_uuid(); photo public.meeting_photos;
begin
 select * into m from public.meetings where id=p_meeting and deleted_at is null and public.is_space_member(space_id) for update;
 if m.id is null then raise exception 'NOT_FOUND'; end if;
 if (select count(*) from public.meeting_photos where meeting_id=m.id and status<>'deleting')>=10 then raise exception 'PHOTO_LIMIT'; end if;
 insert into public.meeting_photos(id,meeting_id,space_id,path,original_name,created_by) values(pid,m.id,m.space_id,m.space_id::text||'/'||m.id::text||'/'||pid::text||'.webp',p_name,auth.uid()) returning * into photo;
 return photo;
end $$;
create function public.finish_photo(p_id uuid,p_size integer,p_width integer,p_height integer) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.meeting_photos set status='ready',size_bytes=p_size,width=p_width,height=p_height where id=p_id and status='pending' and public.is_space_member(space_id) and public.can_read_meeting(meeting_id);
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.delete_meeting(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.meetings set deleted_at=now(),updated_by=auth.uid() where id=p_id and public.is_space_member(space_id) and deleted_at is null;
 if not found then raise exception 'NOT_FOUND'; end if;
 update public.meeting_photos set status='deleting',cleanup_error='等待清理',cleanup_checked_at=null where meeting_id=p_id;
end $$;
create function public.delete_photo(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.meeting_photos set status='deleting',cleanup_error='等待清理',cleanup_checked_at=null where id=p_id and public.is_space_member(space_id);
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.record_cleanup(p_id uuid,p_error text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.meeting_photos set cleanup_error=left(p_error,300),cleanup_checked_at=now() where id=p_id and status='deleting' and public.is_space_member(space_id);
end $$;
-- Private bucket; policies bind every object to the current membership AND metadata.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('couple-private','couple-private',false,5242880,array['image/webp']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp'];
create function public.can_read_object(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.meeting_photos p join public.meetings m on m.id=p.meeting_id where p.path=p_path and p.status='ready' and m.deleted_at is null and public.is_space_member(p.space_id)) or exists(select 1 from public.profiles p where p.avatar_path=p_path and public.can_read_profile(p.id)); $$;
create function public.can_write_object(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.meeting_photos p join public.meetings m on m.id=p.meeting_id where p.path=p_path and p.status='pending' and m.deleted_at is null and public.is_space_member(p.space_id)) or p_path='avatars/'||(select auth.uid())::text||'/avatar.webp'; $$;
create function public.can_delete_object(p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.meeting_photos where path=p_path and public.is_space_member(space_id) and status in ('pending','deleting')) or p_path='avatars/'||(select auth.uid())::text||'/avatar.webp'; $$;
create policy couple_object_read on storage.objects for select to authenticated using(bucket_id='couple-private' and (public.can_read_object(name) or public.can_write_object(name) or public.can_delete_object(name)));
create policy couple_object_insert on storage.objects for insert to authenticated with check(bucket_id='couple-private' and public.can_write_object(name));
create policy couple_avatar_update on storage.objects for update to authenticated using(bucket_id='couple-private' and name='avatars/'||(select auth.uid())::text||'/avatar.webp') with check(bucket_id='couple-private' and name='avatars/'||(select auth.uid())::text||'/avatar.webp');
create policy couple_object_delete on storage.objects for delete to authenticated using(bucket_id='couple-private' and public.can_delete_object(name));
-- Do not inherit PostgreSQL's default PUBLIC EXECUTE on security-definer functions.
revoke all on function public.touch_updated_at(),public.new_profile(),public.guard_member_capacity() from public,anon,authenticated;
revoke all on function public.is_space_member(uuid),public.can_read_profile(uuid),public.can_read_meeting(uuid),public.create_space(text),public.issue_invitation(text),public.accept_invitation(text),public.save_meeting(uuid,date,text,text,text,text,text[]),public.reserve_photo(uuid,text),public.finish_photo(uuid,integer,integer,integer),public.delete_meeting(uuid),public.delete_photo(uuid),public.record_cleanup(uuid,text),public.can_read_object(text),public.can_write_object(text),public.can_delete_object(text) from public,anon,authenticated;
grant execute on function public.is_space_member(uuid),public.can_read_profile(uuid),public.can_read_meeting(uuid),public.create_space(text),public.issue_invitation(text),public.accept_invitation(text),public.save_meeting(uuid,date,text,text,text,text,text[]),public.reserve_photo(uuid,text),public.finish_photo(uuid,integer,integer,integer),public.delete_meeting(uuid),public.delete_photo(uuid),public.record_cleanup(uuid,text),public.can_read_object(text),public.can_write_object(text),public.can_delete_object(text) to authenticated;
commit;
