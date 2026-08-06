-- Migration: Update all patients and staff names to authentic Ethiopian local names

UPDATE public.staff s
SET full_name = (ARRAY['Dr Bethlehem Tadesse','Dr Dawit Yohannes','Dr Getachew Reda','Dr Almaz Tefera','Dr Kebede Bekele','Dr Solomon Worku','Nurse Tigist Alemu','Nurse Abebech Tadesse','Nurse Selamawit Haile','Nurse Mulugeta Assefa'])[1 + (abs(hashtext(s.id::text)) % 10)];

UPDATE public.patients p
SET full_name = (ARRAY['Abebe','Abebech','Tigist','Dawit','Almaz','Bethlehem','Getachew','Yohannes','Kebede','Bereketeab','Selamawit','Mulugeta','Eleni','Haile','Solomon','Frehiwot'])[1 + (abs(hashtext(p.mrn)) % 16)] || ' ' ||
                (ARRAY['Tadesse','Alemu','Bekele','Yilma','Worku','Mamo','Tefera','Reda','Assefa','Hailemariam'])[1 + (abs(hashtext(p.mrn)) % 10)],
    phone = '+251 9' || lpad((abs(hashtext(p.mrn)) % 100000000)::text, 8, '0'),
    insurance_provider = (ARRAY['Ethiopian Health Insurance Agency','Nyala Insurance','Awash Insurance',NULL])[1 + (abs(hashtext(p.mrn)) % 4)];
