Subject: MedicForge updates: quizzes, grading, attendance, and clinical tracking

Hi everyone,

We have just shipped a batch of fixes and improvements, most of which came
straight from things you reported. Everything below is live on the site right
now.

Most of it works on its own with nothing for you to do. A few items need a
one time setting on your end, and I have marked those clearly.

====================================================================
QUIZZES AND GRADING
====================================================================

Short answer questions display properly again
Short answer questions were showing up for students as blank multiple choice
questions with no options to pick from. That is fixed, and we repaired the
existing questions in your question banks as part of it, so there is nothing
for you to rebuild.

Short answer questions are now graded by you, not by the system
When a student submits a quiz containing short answer questions, their written
answers go into your grading queue instead of being auto marked. Open Grading
from the instructor menu to see what is waiting. Until you mark them, the
student sees that part of their score as pending rather than as a wrong answer.

You can change a short answer score after you have marked it
If you want to revise a mark you already gave, you can go back in and adjust
it. Previously the grading screen would tell you there was nothing left to
mark and shut you out.

Grades now show as percentages
Individual assignment grades were showing as raw points, for example 7/14, on
both the student side and the instructor side. They now show as a percentage,
with the points still listed underneath for reference.

Letter grades are calculated correctly
Letter grades were being worked out from raw points rather than the percentage,
which meant a 50 point quiz with a score of 49 could come out as a failing
grade. We fixed the calculation and repaired 45 existing scores that were
affected.

Answer option boxes are bigger
The answer choice fields in the quiz builder are now multi line and grow as you
type, so longer answer choices are no longer squeezed into a one line box.

Students can review a quiz after finishing it
Students can go back through a submitted quiz and see their own answers next to
the correct ones. This respects the setting you already control, so tick
"Show correct answers after submission" on the assignment if you want students
to have it.

====================================================================
PRACTICE QUIZZES CAN NOW BE LEFT OUT OF THE GRADE  (please check this)
====================================================================

When you create or edit an assignment there is a new tick box labelled
"Counts toward the grade". It is on by default.

Untick it for practice quizzes, review quizzes, or anything else you want
students to be able to attempt without it moving their course average.
Students still take it normally and still see their score. It simply does not
count toward the grade.

What you need to do: if you already have practice quizzes set up, go into each
one and untick that box. We deliberately left every existing assignment
counting, because flipping them automatically would have changed student
grades without warning. That call is yours, not ours.

====================================================================
DUE DATES AND TIMES  (please check this)
====================================================================

Due times now save exactly what you type
If you set a quiz to close at 11:59 PM, it was being stored several hours off.
Depending on the time of year, that meant some students lost access earlier
than you intended and others kept it longer. The time you enter is now the time
that gets saved.

You can clear a due date
Once a due date was set, there was no way to remove it. You can now empty the
field and save.

Your organization time zone
There is a new time zone setting on the Organization page in your admin
settings. This is what due dates and the automatic attendance opening use to
work out what time it is where you are.

What you need to do: we have already set this for every organization currently
running classes, so it should be correct. Please take a second to confirm it,
especially if you have campuses in more than one time zone.

====================================================================
ATTENDANCE  (please check this)
====================================================================

Class nights now open by themselves
Attendance for a scheduled class opens automatically 15 minutes before the
class start time, so students can check in without anyone having to press
Start Attendance first. The system looks for classes due to open every five
minutes.

What you need to do: this only works for classes that exist on a schedule. If
you have been starting attendance by hand each week, set your class schedule up
on the cohort and it will take it from there.

Add a whole term of class dates in one go
On the cohort page there is an Add Class Dates button. Paste your class dates
in, either one per line or separated by commas, and it creates a class session
for each one. It understands the formats you would normally write, such as
"Nov 17, 2026" or "11/17/2026", and it shows you how it read your list before
anything is created. Dates that already have a class, or that land on a date
you have excluded, get skipped and reported back to you.

Every student now appears on the attendance roster
The roster was only listing students who had already checked in, which made it
awkward to mark somebody absent. It now lists everyone enrolled, and you can
set a status and add a note for any of them.

Substitute instructors can see the day's classes
Any staff member at your organization can now see and open the classes
scheduled for that day, not only the assigned instructor. If you have a sub
covering a class night, they can take attendance.

====================================================================
QUESTION BANK
====================================================================

You can search your questions by tag
Your questions already carried tags, but there was no way to search on them.
The question bank now has a tag filter, so you can pull up all your airway
questions or all your cardiology questions at once instead of scrolling.

====================================================================
ASSIGNMENTS
====================================================================

Assignments are sorted by due date
The assignment list was in no particular order. It now runs in due date order,
so whatever is due next sits at the top.

====================================================================
CLINICAL TRACKING
====================================================================

Students can log vital signs on their own
There is a new vital signs page under Clinical on the student side. Students
can record a set of vitals directly, without having to build a full patient
contact report around it. Sets recorded inside a patient contact report still
count as well.

You can set a vital signs requirement for a course
On the course edit page there is a field for how many documented sets students
need. Fill it in and students will see their progress against that target on
their vital signs page. On the instructor side you get a roster showing where
every student stands. Leave it empty if the course has no requirement.

Clinical site contact details are visible
Site records now show the site's contact information, so students and
instructors are not digging around for a phone number.

====================================================================

If anything here is not behaving the way you expect, or you hit something else,
please tell us. Several of the fixes above exist because one of you took the
time to report them, and that is genuinely the fastest way for us to find this
stuff.

Thanks,
