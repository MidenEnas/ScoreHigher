These are som echats from a failed assistant helping me create what I want.

Perfect thank you, now I will explain the scoring system so we cna manage how the judge screen should look.

There will be x amount of boulders
and X amount of lead routes, therefore there should be a sub menu on each comp for lead and for boulder. A Flash is 75pts(So top on first attempt) top on second attempt is 50 and three or more attempts is 25. A zone which is a marked point on the wall if they don't get a top is worth 15pts for each climb if it has been topped it is an additional 1.5 x boulder number that is addded to the total for that climbs points. This is all for Bouldering. For lead it will be based on how high they get, they all have only 1 attempt. So 3 Zones each worth 15 points, and 75 pts for a top

please rewrite how the competitions for boulder are done completely. I want to be able to add routes(There are no names, just route 1, 2, 3 etc. depedning on how many routes I say there are for lead, boulder whatever) There must also be NO grade entry as it is irrelevant for comps. Top and zone points should also not be editable as you know how the points work. This is just us editing the admin way of creating comps, nothing else yet, we will do the user interface next. Please ask if anything is unclear, NEVER assume anything

Before I rewrite this, let me clarify:

When creating a competition, should the admin specify:

Number of boulder routes (e.g., 5 boulders)
Number of lead routes (e.g., 2 leads)
And then routes auto-generate as "Boulder 1", "Boulder 2", "Lead 1", etc.?
Are the points always fixed?

Boulder: 75/50/25 for top, 15 for zone
Lead: 15 per zone, 75 for top
No customization at all?
What info do you need when creating a competition?

Just: Competition name, date, # of boulder routes, # of lead routes?
Anything else?


1. No, some comps are only lead, some only boulder. It should be once you create the comp, the admin can then select yes to boulder and no to lead for instance, and then enter the amount of routes. 
2. We can also do a selector for admins to be able to edit the values of tops, zones, etc. But the points should stay fixed by default, and if a climber tops a climb, the climb number x 1.5 to be added to the total of that climb should also be a slider to select when making the comp.
3. Comp Name, Date, #Routes for both lead and boulder, obviously depedning on which are selected if not both.

Got it! So:

Create competition form: Name, Date, checkboxes for Boulder/Lead, number inputs for route counts
Point customization with defaults:
Boulder: Flash=75, 2nd=50, 3+=25, Zone=15, Topped bonus multiplier=1.5
Lead: Zone=15, Top=75
Routes auto-generate as "Boulder 1", "Boulder 2", "Lead 1", "Lead 2" when competition is created
I'll need to:

Update database to store competition settings (disciplines, route counts, point values)
Create routes automatically when competition is created
Update scoring logic to use competition-specific point values
Should I proceed with this?

Yes. Also competitors wont be added on the admin page, there should be a selector as well for saying if a comp is self judged or not. If it is judged then a judge will add competitors, otherwise if it is self judged we need to have a form where competitors can submit their scores themselves. I will explain this futher when we get to desigining those pages, just something to keep in mind.