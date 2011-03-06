echo "\
select files.filename, count(*) as downloads from files join tickets on files.file_id = tickets.file and present = 1 group by tickets.file;\
select count(*) as clients from clients;\
select count(*) as tickets from tickets" | mysql --user=root --password=NICIfIXj4Q0FWpt84wDEKhAaKa9CYGj8IPfXp5Po eightyone
