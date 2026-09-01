"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Glasses, MapPin, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const subjects = ["Algebra I", "Geometry", "Algebra II", "AP Precalculus", "AP Calculus AB", "AP Calculus BC", "AP Statistics"];
const locations = ["Ms. Mardi", "Library", "Patio / Outside", "Other"];
const durations = ["45 minutes", "60 minutes", "Other"];

type FormState = {
  subject: string; date: string; time: string; duration: string; location: string; otherLocation: string;
  name: string; teacher: string; email: string; phone: string; contactPreference: string; notes: string;
};

const initialForm: FormState = {
  subject: "", date: "", time: "", duration: "45 minutes", location: "", otherLocation: "",
  name: "", teacher: "", email: "", phone: "", contactPreference: "email", notes: "",
};

function dateInputBounds() {
  const today = new Date();
  const max = new Date(today);
  max.setDate(max.getDate() + 30);
  const format = (date: Date) => date.toISOString().slice(0, 10);
  return { min: format(today), max: format(max) };
}

function isWeekday(value: string) {
  if (!value) return true;
  const day = new Date(`${value}T12:00:00`).getDay();
  return day >= 1 && day <= 5;
}

const morning45 = ["7:15 AM", "7:30 AM", "7:45 AM", "8:00 AM"];
const morning60 = ["7:15 AM", "7:30 AM", "7:45 AM"];
const afternoon45 = ["4:45 PM", "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM"];
const afternoon60 = ["4:45 PM", "5:00 PM", "5:15 PM", "5:30 PM"];

function TutorRequestCard({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [step, setStep] = useState(1);
  const [subjectOpen, setSubjectOpen] = useState(initiallyOpen);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const bounds = useMemo(() => dateInputBounds(), []);
  const timeSlots = form.duration === "60 minutes" ? [...morning60, ...afternoon60] : [...morning45, ...afternoon45];

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const next = () => {
    if (step === 1 && !form.subject) return setError("Choose your math course first.");
    if (step === 2) {
      if (!form.date || !form.time) return setError("Choose a weekday and a time.");
      if (!isWeekday(form.date)) return setError("Tutoring is available Monday through Friday.");
    }
    if (step === 3 && !form.location) return setError("Choose a meeting location.");
    if (step === 3 && form.location === "Other" && !form.otherLocation.trim()) return setError("Tell us where you would prefer to meet.");
    setStep((current) => Math.min(current + 1, 4));
    setError("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.teacher.trim()) return setError("Add your name and math teacher.");
    if (!form.email.trim() && !form.phone.trim()) return setError("Add an Austin High email or a phone number.");
    if (form.contactPreference === "email" && !form.email.trim()) return setError("Add an email, or choose phone as your contact preference.");
    if (form.contactPreference === "phone" && !form.phone.trim()) return setError("Add a phone number, or choose email as your contact preference.");

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "We could not send your request.");
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not send your request.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="request-card success-card" aria-live="polite">
        <span className="success-icon"><Check aria-hidden="true" /></span>
        <p className="card-kicker">Request received</p>
        <h2>You’re on the list.</h2>
        <p>Mu Alpha Theta officers will review your request, match you with a tutor, and contact you by {form.contactPreference}.</p>
        <div className="success-summary">
          <strong>{form.subject}</strong><span>{form.date} · {form.time}</span>
          <span>{form.location === "Other" ? form.otherLocation : form.location}</span>
        </div>
        <Button className="preview-button" onClick={() => { setForm(initialForm); setStep(1); setSubmitted(false); }}>Make another request</Button>
      </div>
    );
  }

  return (
    <form className="request-card functional-card" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="card-kicker">Start your request</p>
          <h2>{step === 1 ? "What can we help with?" : step === 2 ? "When works for you?" : step === 3 ? "Where should you meet?" : "How can we reach you?"}</h2>
        </div>
        <span className="step-count">{step} / 4</span>
      </div>
      <div className="progress-track" aria-label={`Step ${step} of 4`}><span style={{ width: `${step * 25}%` }} /></div>

      {step === 1 && (
        <div className="form-step">
          <label htmlFor="subject">Choose your course</label>
          <Select open={subjectOpen} onOpenChange={setSubjectOpen} value={form.subject} onValueChange={(value) => setField("subject", value)}>
            <SelectTrigger id="subject" className="course-select"><SelectValue placeholder="Select a math class" /></SelectTrigger>
            <SelectContent>{subjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent>
          </Select>
          <p className="field-help">Your tutor will be someone familiar with this course.</p>
        </div>
      )}

      {step === 2 && (
        <div className="form-step">
          <label htmlFor="date">Preferred date</label>
          <Input id="date" type="date" min={bounds.min} max={bounds.max} value={form.date} onChange={(event) => { setField("date", event.target.value); setField("time", ""); }} />
          {!isWeekday(form.date) && <p className="inline-warning">Please choose a Monday–Friday date.</p>}
          <label htmlFor="duration">Session length</label>
          <Select value={form.duration} onValueChange={(value) => { setField("duration", value); setField("time", ""); }}>
            <SelectTrigger id="duration" className="course-select"><SelectValue /></SelectTrigger>
            <SelectContent>{durations.map((duration) => <SelectItem key={duration} value={duration}>{duration}</SelectItem>)}</SelectContent>
          </Select>
          <label htmlFor="time">Preferred start time</label>
          <Select value={form.time} onValueChange={(value) => setField("time", value)}>
            <SelectTrigger id="time" className="course-select"><SelectValue placeholder="Choose a time" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="morning-label" disabled>Before school</SelectItem>
              {timeSlots.filter((time) => time.includes("AM")).map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
              <SelectItem value="afternoon-label" disabled>After school</SelectItem>
              {timeSlots.filter((time) => time.includes("PM")).map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
            </SelectContent>
          </Select>
          {form.duration === "Other" && <p className="field-help">Pick the closest start time and explain the length you need in the final notes.</p>}
        </div>
      )}

      {step === 3 && (
        <div className="form-step">
          <label htmlFor="location">Preferred location</label>
          <Select value={form.location} onValueChange={(value) => setField("location", value)}>
            <SelectTrigger id="location" className="course-select"><SelectValue placeholder="Choose a meeting spot" /></SelectTrigger>
            <SelectContent>{locations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent>
          </Select>
          {form.location === "Other" && <Input aria-label="Other preferred location" placeholder="Type your preferred location" value={form.otherLocation} onChange={(event) => setField("otherLocation", event.target.value)} />}
          <p className="field-help">The exact spot is confirmed after an officer assigns your tutor.</p>
        </div>
      )}

      {step === 4 && (
        <div className="form-step contact-step">
          <div className="field-pair">
            <div><label htmlFor="name">Your name</label><Input id="name" autoComplete="name" value={form.name} onChange={(event) => setField("name", event.target.value)} /></div>
            <div><label htmlFor="teacher">Math teacher</label><Input id="teacher" value={form.teacher} onChange={(event) => setField("teacher", event.target.value)} /></div>
          </div>
          <label htmlFor="email">Austin High email</label>
          <Input id="email" type="email" autoComplete="email" placeholder="student@austinisd.org" value={form.email} onChange={(event) => setField("email", event.target.value)} />
          <label htmlFor="phone">Phone number</label>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="(512) 555-0123" value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
          <fieldset className="contact-choice">
            <legend>Preferred confirmation</legend>
            <button type="button" className={form.contactPreference === "email" ? "active" : ""} onClick={() => setField("contactPreference", "email")}>Email</button>
            <button type="button" className={form.contactPreference === "phone" ? "active" : ""} onClick={() => setField("contactPreference", "phone")}>Phone</button>
          </fieldset>
          <label htmlFor="notes">What do you want help with? <span>(optional)</span></label>
          <Textarea id="notes" placeholder="A topic, assignment, test, or anything else your tutor should know." value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        {step > 1 && <Button type="button" variant="outline" className="back-button" onClick={() => { setStep((current) => current - 1); setError(""); }}><ArrowLeft aria-hidden="true" /> Back</Button>}
        {step < 4 ? <Button type="button" className="preview-button" onClick={next}>Continue <ArrowRight aria-hidden="true" /></Button> : <Button type="submit" className="preview-button" disabled={sending}>{sending ? "Sending…" : "Send tutoring request"}</Button>}
      </div>
      <p className="preview-note">Free tutoring · Monday–Friday · Austin High</p>
    </form>
  );
}

export default function Home() {
  const [requestLaunch, setRequestLaunch] = useState(0);
  const openRequest = () => setRequestLaunch((current) => current + 1);

  return (
    <main>
      <section className="hero-shell">
        <div className="utility-row">
          <a className="tutor-view-link" href="/tutor/login"><Glasses aria-hidden="true" /> Tutor View</a>
        </div>
        <nav className="floating-nav" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="Mu Alpha Theta home">
            <span className="brand-mark"><Image src="/mu-alpha-theta-logo.png" alt="" width={42} height={42} priority unoptimized /></span>
            <span><strong>Mu Alpha Theta</strong><small>Austin High Math Honor Society</small></span>
          </a>
          <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#subjects">Subjects</a></div>
          <Button type="button" className="nav-cta" onClick={openRequest}>Request tutoring</Button>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles aria-hidden="true" size={16} />Free, student-led math support</p>
            <h1>Math makes more sense together.</h1>
            <p className="hero-lede">Get matched with an Austin High Mu Alpha Theta tutor who has taken your course and knows what it feels like to get stuck.</p>
            <div className="hero-actions"><Button type="button" size="lg" className="primary-action" onClick={openRequest}>Find a tutor <ArrowRight aria-hidden="true" /></Button><span>No cost. No judgment. Just help.</span></div>
          </div>

          <div className="request-preview" id="request">
            <div className="math-motif" aria-hidden="true"><span className="tile tile-one">x²</span><span className="tile tile-two">π</span><span className="tile tile-three">∫</span><span className="tile tile-four">θ</span></div>
            <TutorRequestCard key={requestLaunch} initiallyOpen={requestLaunch > 0} />
          </div>
        </div>

        <div className="trust-row" aria-label="Tutoring highlights"><div><strong>7</strong><span>math courses</span></div><div><MapPin aria-hidden="true" /><span>Meet at school</span></div><div><Clock3 aria-hidden="true" /><span>45 or 60 minutes</span></div></div>
      </section>

      <section className="how-section" id="how-it-works">
        <p className="section-label">How it works</p><h2>From “I’m lost” to a plan.</h2>
        <div className="steps-grid"><article><span>01</span><h3>Tell us what you need</h3><p>Choose your course, teacher, preferred time, and meeting spot.</p></article><article><span>02</span><h3>We find the right tutor</h3><p>A club officer matches your request with an available student tutor.</p></article><article><span>03</span><h3>Meet and work through it</h3><p>Bring a question, an assignment, or just the topic that is not clicking.</p></article></div>
      </section>

      <section className="subjects-section" id="subjects"><div><p className="section-label">Courses we cover</p><h2>Support for wherever you are in math.</h2></div><div className="subject-chips">{subjects.map((subject) => <span key={subject}>{subject}</span>)}</div></section>
    </main>
  );
}
