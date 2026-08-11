-- Sample data — mirrors the old src/data/mockData.ts mock records, so the
-- pilot deploy isn't empty. Run after schema.sql. Safe to re-run: each
-- INSERT is guarded with ON CONFLICT DO NOTHING keyed on student_code / id.
--
-- Teachers are NOT seeded here — teacher rows only make sense once a real
-- Supabase Auth account exists to own them (see README's "Creating a new
-- staff or parent account" runbook). Same for linking a student's
-- parent_user_id: that happens after the parent's real login exists.

insert into public.students
  (student_code, name, grade_level, classroom, roll_number, date_of_birth, enrollment_date, house, parent_name, parent_email, avatar_url, clubs, teacher_remarks, general_status, attendance_total_days, attendance_present, attendance_absent, attendance_unexcused)
values
  ('LIS-2026-001', 'Sophia Lindner', 'Grade 11 - IB Science Track', 'Room 304 (Vanguard Block)', 1, '2009-04-12', '2021-09-01', 'Phoenix', 'Maximilian Lindner', 'max.lindner@example.com', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80', array['Varsity Debate', 'Robotics Society', 'Chamber Orchestra'], 'Sophia is an exceptional academic presence in our eleventh grade class. Her dedication to experimental research in physics is outstanding, and her leadership in the Robotics Club has inspired several younger scholars.', 'Excellent', 140, 138, 2, 0),
  ('LIS-2026-002', 'Liam Chen', 'Grade 10 - Honors Track', 'Room 201 (Crescent Wing)', 4, '2010-08-25', '2022-09-01', 'Pegasus', 'Dr. Helen Chen', 'h.chen@example.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', array['Varsity Swimming', 'Chess Club Secondary', 'Environmental League'], 'Liam demonstrates brilliant analytical skill, particularly in biological sciences. He balances his academic coursework very well with his swimming schedule.', 'Good', 140, 135, 5, 0),
  ('LIS-2026-003', 'Isabella Bennett', 'Grade 12 - Liberal Arts Track', 'Room 402A (Heritage Tower)', 12, '2008-01-14', '2020-09-01', 'Dragon', 'Marcus Bennett', 'm.bennett@example.com', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', array['Drama Guild', 'Creative Writing Circle', 'Model United Nations'], 'Isabella is a remarkably expressive writer with deep insights into geopolitics. Her leading performance in the spring theatre play was outstanding.', 'Excellent', 140, 139, 1, 0),
  ('LIS-2026-004', 'Alexander Rostova', 'Grade 9 - Foundation Year', 'Room 105 (Foundation Block)', 7, '2011-11-30', '2023-09-01', 'Griffin', 'Dr. Dmitry Rostov', 'dmitry.rostova@example.com', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80', array['Junior Football Team', 'Astronomy Society', 'LIS Green Project'], 'Alexander shows high potential in technology but is struggling with class attendance due to occasional health issues. Needs to master focus and structure his assignment schedules.', 'Needs Improvement', 140, 120, 20, 12),
  ('LIS-2026-005', 'Gabriella Patel', 'Grade 10 - Science Track', 'Room 203 (Crescent Wing)', 15, '2010-02-18', '2022-09-01', 'Phoenix', 'Devendra Patel', 'dev.patel@example.com', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80', array['School Newsletter', 'Model UN', 'Symphonic Winds'], 'Gabriella displays extraordinary analytical maturity in history and literature. She writes gracefully and contributes key, critical reflections.', 'Excellent', 140, 139, 1, 0)
on conflict (student_code) do nothing;

insert into public.grades (student_id, subject, score, teacher, term)
select s.id, g.subject, g.score, g.teacher, g.term
from (values
  ('LIS-2026-001', 'Advanced Physics (IB)', 95, 'Dr. Evelyn Foster', 'Term 2'),
  ('LIS-2026-001', 'Calculus BC', 98, 'Mr. David Chen', 'Term 2'),
  ('LIS-2026-001', 'World Literature', 91, 'Mrs. Claire Beaumont', 'Term 2'),
  ('LIS-2026-002', 'Pre-Calculus', 92, 'Mr. David Chen', 'Term 2'),
  ('LIS-2026-002', 'Biology Honors', 96, 'Dr. Arthur Pendelton', 'Term 2'),
  ('LIS-2026-003', 'Creative Writing Seminar', 99, 'Mrs. Claire Beaumont', 'Term 2'),
  ('LIS-2026-003', 'Comparative Politics', 95, 'Mr. Robert Vance', 'Term 2'),
  ('LIS-2026-004', 'Algebra I', 79, 'Mr. David Chen', 'Term 2'),
  ('LIS-2026-004', 'Intro to Tech & Coding', 90, 'Ms. Clara Croft', 'Term 2'),
  ('LIS-2026-005', 'Geometry Honors', 94, 'Mr. David Chen', 'Term 2'),
  ('LIS-2026-005', 'Chemistry Honors', 92, 'Dr. Arthur Pendelton', 'Term 2')
) as g(student_code, subject, score, teacher, term)
join public.students s on s.student_code = g.student_code
on conflict (student_id, subject) do nothing;

insert into public.events (title, date, time, location, category, description, organizer)
values
  ('Autumn Academic Progress Review', '2026-06-08', '04:00 PM - 07:30 PM', 'Central Conference Hall', 'Academic', 'Biannual forum with subject headers to outline terminal achievements, coursework targets, and upcoming IB exams schedules with personal guidance counselors.', 'Academic Registry'),
  ('Lindner Symphony & Chamber Concert', '2026-06-12', '06:00 PM - 08:30 PM', 'Liszt Auditorium (Performing Arts Wing)', 'Arts', 'Symphony orchestra and classical ensembles performing masterpieces, including the premiere of the new senior wind trio composition.', 'Music & Dramatics Faculty'),
  ('Inter-House Football Cup Finals', '2026-06-16', '02:00 PM - 05:00 PM', 'Main School Grounds (Athletics Arena)', 'Sports', 'The ultimate gridiron challenge matching Phoenix House and Dragon House in the annual championship round.', 'Physical Education Department'),
  ('Alumni & Parents Innovation Exhibit', '2026-06-18', '10:00 AM - 04:00 PM', 'Stavros Science Atrium', 'Community', 'Interactive STEM exhibition featuring high school student research projects alongside presentations from guest technology developers.', 'Robotics & Science Alliance'),
  ('Midsummer Break Begins', '2026-06-25', 'Full Day', 'Campus-wide', 'Holiday', 'All classes adjourn for the Midsummer recess. Administrative offices operate on restricted operational hours.', 'General Office'),
  ('Mock IB Diploma Science Exams', '2026-06-05', '08:30 AM - 12:00 PM', 'Examinations Hall B', 'Exams', 'Mandatory standard examination simulation testing for Honors Chemistry and Physics segments.', 'IB Science Division')
on conflict do nothing;
