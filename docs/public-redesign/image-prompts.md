# Image prompts for AcadeGrade (ChatGPT / any image generator)

The public site ships with **no photographs** until images like these exist. Generate the ones you like and save them as `<slot>.png` (named as below) in `acadegrade-web/design-input/images/`. Then tell me, and I'll optimise them and switch the slots on. No page code changes are needed.

## 1. Paste this first, once, at the start of the chat

> You are creating a consistent set of editorial photographs for AcadeGrade, a CGPA and academic-planning app for Nigerian university students. Every image in this set must share one look:
>
> - **Style:** modern editorial photography, full natural colour, warm daylight or soft evening lamp light, shallow depth of field, real textures (paper, wood, fabric). Like a premium magazine or a top tech brand campaign. Not stock-photo smiling, not AI-glossy, not black and white, no filters.
> - **People:** Nigerian university students aged 18–25, natural and candid, dressed like real Nigerian students (casual, smart casual, ankara details are welcome). Natural poses, never looking at the camera, never grinning at a phone.
> - **Colour accents to weave in naturally** (clothing, objects, light): deep indigo `#18153D`, violet `#5B52F2` and warm gold `#F2A922`, on calm off-white and soft lilac-grey surfaces. The image must still look like a real photograph, not a colour-graded poster.
> - **Phones:** modern, generic Android phones with no brand logos. Any screen shows a clean, blurred, abstract interface (no readable text, no real app logos).
> - **Never include:** university names, logos, crests, signboards, gates or recognisable campus buildings; brand logos; readable text on paper or screens; extra fingers or warped hands; watermarks.
> - **Setting:** generic Nigerian student life (hostel desks, reading rooms, lecture-hall seats, a shaded campus walkway with no signs) that could be at ANY Nigerian university.
>
> Confirm you understand, then I will give you the images one at a time.

## 2. One prompt per image

| Save as | Shape | Prompt |
|---|---|---|
| `home-showcase.png` | 16:9 wide, 2400×1350 | A wide, calm shot of an empty modern lecture hall at golden hour, warm light through tall windows across rows of wooden desks, one indigo backpack on a desk in the foreground, soft lilac-grey walls, no signs or text anywhere. Space on the left third for text. |
| `home-faq-tall.png` | 3:4 portrait, 1500×2000 | A Nigerian female student seen from the side at a hostel study desk in the evening, a warm desk lamp, an open notebook with handwritten notes (unreadable), a generic Android phone face down, a gold mug, an indigo throw on the chair. Calm and focused. |
| `home-faq-square.png` | 1:1, 1600×1600 | Top-down close-up of a desk: a printed result slip with blurred, unreadable rows, a scientific calculator, a gold pen and a cup of tea. Off-white paper, violet sticky note. |
| `scanner.png` | 4:5, 1600×2000 | Close-up of two hands holding a generic Android phone above a printed result sheet on a wooden table, the phone screen showing a soft blurred scanning frame, warm daylight. No readable text. |
| `academind.png` | 4:5, 1600×2000 | A Nigerian male student in a quiet reading room at night, reading his phone thoughtfully, soft violet and gold reflections from a lamp, bookshelves softly blurred behind, no signs. |
| `timetable.png` | 16:9, 2400×1350 | Morning on a shaded campus walkway (no signboards, no buildings that could be recognised), two students walking to class from behind, one checking the time on a phone, warm sunlight and long shadows, a touch of gold in a bag strap. |
| `about.png` | 4:5, 1600×2000 | A young Nigerian developer at a simple desk with a laptop and a phone, a small notebook of sketches, warm afternoon light, indigo shirt, focus on the hands and screen (no readable text). |
| `support.png` | 1:1, 1600×1600 | Close-up of a student's hands typing a message on a generic Android phone, a coffee cup and a notebook nearby, soft daylight, calm and friendly. |
| `auth-login.png` | 4:5, 1600×2000 | A quiet study corner at dawn: a chair, a desk with a closed laptop, a gold desk lamp turned on, a plant, a soft lilac wall. No people. |
| `auth-register.png` | 4:5, 1600×2000 | Three Nigerian students from behind, sitting on lecture-hall seats looking towards a bright window, notebooks on their laps, warm light, no faces visible. |
| `auth-forgot.png` | 4:5, 1600×2000 | A single gold key resting on an open notebook beside a generic Android phone, top-down, off-white and indigo tones, calm. |
| `notfound.png` | 4:5, 1600×2000 | An empty corridor of a lecture building with a single sheet of paper pinned to a cork board (paper text unreadable), warm late-afternoon light, a hint of violet in the shadows. |

## 3. Tips

- **Retry until the hands are right:** say "Regenerate, the hands look unnatural" or "Remove all text" until it is clean.
- **If a recognisable building or sign appears,** say "Make the building generic, remove all signage".
- **Keep the set consistent:** if one image drifts in colour, say "Match the colour and lighting of the previous image".
- **Licence:** check your image generator's terms allow commercial use of the images.
- **People in these images are illustrations of student life,** not AcadeGrade users. They are never captioned or presented as real customers or testimonials.
