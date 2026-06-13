--
-- PostgreSQL database dump
--

\restrict 2irviIQLzeZKXwHKZldmnXQkY5TY6LMbl17jL36mm6F3UOCbwMJO3BR2iAEpiHA

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

-- uuid-ossp not available on most cloud Postgres; using built-in gen_random_uuid() instead
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

-- COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_system_configs_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_system_configs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action character varying(100) NOT NULL,
    target_type character varying(50),
    target_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: correction_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correction_stats (
    id integer NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: correction_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.correction_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: correction_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.correction_stats_id_seq OWNED BY public.correction_stats.id;


--
-- Name: corrections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corrections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    draft_id uuid NOT NULL,
    score integer NOT NULL,
    score_breakdown jsonb,
    overall_comment text,
    error_list jsonb,
    format_errors jsonb,
    content_comments jsonb,
    suggestions jsonb,
    revised_version text,
    review_report jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    content text NOT NULL,
    word_count integer,
    status character varying(20) DEFAULT 'draft'::character varying,
    time_spent integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id character varying(36) NOT NULL,
    rating integer NOT NULL,
    category character varying(50) NOT NULL,
    content text NOT NULL,
    contact character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id character varying(36),
    CONSTRAINT feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: material_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    material_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    translation text,
    category character varying(50) NOT NULL,
    type character varying(50),
    tags text[],
    usage_scenario text,
    tips text,
    is_common boolean DEFAULT true,
    level character varying(10),
    favorites_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: mock_exam_participations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mock_exam_participations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mock_exam_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    score integer,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    answers jsonb,
    section_results jsonb,
    max_score integer
);


--
-- Name: mock_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mock_exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    level character varying(10) NOT NULL,
    duration integer NOT NULL,
    questions jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(20) DEFAULT 'mock'::character varying,
    enabled boolean DEFAULT true
);


--
-- Name: notification_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_recipients (
    id uuid DEFAULT (md5(((random())::text || (clock_timestamp())::text)))::uuid NOT NULL,
    notification_id uuid,
    user_id uuid,
    is_read boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT (md5(((random())::text || (clock_timestamp())::text)))::uuid NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    type character varying(50) DEFAULT 'system'::character varying,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    requirements text,
    type character varying(50) NOT NULL,
    level character varying(10) NOT NULL,
    topic character varying(50),
    difficulty character varying(10),
    year integer,
    is_ai_generated boolean DEFAULT false,
    word_count_min integer,
    word_count_max integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    is_active boolean DEFAULT true
);


--
-- Name: seed_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seed_log (
    seed_name text NOT NULL,
    deployed_at timestamp without time zone DEFAULT now()
);


--
-- Name: system_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text,
    config_type character varying(20) DEFAULT 'string'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: training_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    requirements text,
    level character varying(10) NOT NULL,
    answer jsonb NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: training_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    question_id uuid,
    answer text,
    score integer,
    feedback text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    exercise_id uuid,
    ai_feedback text
);


--
-- Name: training_resets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_resets (
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    reset_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: training_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_stats (
    id integer NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: training_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.training_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: training_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.training_stats_id_seq OWNED BY public.training_stats.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    level character varying(10) DEFAULT 'both'::character varying,
    avatar_url character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'user'::character varying,
    status character varying(20) DEFAULT 'active'::character varying
);


--
-- Name: correction_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_stats ALTER COLUMN id SET DEFAULT nextval('public.correction_stats_id_seq'::regclass);


--
-- Name: training_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_stats ALTER COLUMN id SET DEFAULT nextval('public.training_stats_id_seq'::regclass);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: checkins checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_pkey PRIMARY KEY (id);


--
-- Name: checkins checkins_user_id_date_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_user_id_date_type_key UNIQUE (user_id, date, type);


--
-- Name: correction_stats correction_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correction_stats
    ADD CONSTRAINT correction_stats_pkey PRIMARY KEY (id);


--
-- Name: corrections corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_pkey PRIMARY KEY (id);


--
-- Name: drafts drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: material_favorites material_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_favorites
    ADD CONSTRAINT material_favorites_pkey PRIMARY KEY (id);


--
-- Name: material_favorites material_favorites_user_id_material_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_favorites
    ADD CONSTRAINT material_favorites_user_id_material_id_key UNIQUE (user_id, material_id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: mock_exam_participations mock_exam_participations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_exam_participations
    ADD CONSTRAINT mock_exam_participations_pkey PRIMARY KEY (id);


--
-- Name: mock_exams mock_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_exams
    ADD CONSTRAINT mock_exams_pkey PRIMARY KEY (id);


--
-- Name: notification_recipients notification_recipients_notification_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_notification_id_user_id_key UNIQUE (notification_id, user_id);


--
-- Name: notification_recipients notification_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: seed_log seed_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seed_log
    ADD CONSTRAINT seed_log_pkey PRIMARY KEY (seed_name);


--
-- Name: system_configs system_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_config_key_key UNIQUE (config_key);


--
-- Name: system_configs system_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_configs
    ADD CONSTRAINT system_configs_pkey PRIMARY KEY (id);


--
-- Name: training_exercises training_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_exercises
    ADD CONSTRAINT training_exercises_pkey PRIMARY KEY (id);


--
-- Name: training_records training_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_records
    ADD CONSTRAINT training_records_pkey PRIMARY KEY (id);


--
-- Name: training_resets training_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_resets
    ADD CONSTRAINT training_resets_pkey PRIMARY KEY (user_id, type);


--
-- Name: training_stats training_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_stats
    ADD CONSTRAINT training_stats_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_admin_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_action ON public.admin_logs USING btree (action);


--
-- Name: idx_admin_logs_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_time ON public.admin_logs USING btree (created_at);


--
-- Name: idx_checkins_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_user_date ON public.checkins USING btree (user_id, date);


--
-- Name: idx_corrections_draft; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corrections_draft ON public.corrections USING btree (draft_id);


--
-- Name: idx_drafts_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drafts_question ON public.drafts USING btree (question_id);


--
-- Name: idx_drafts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drafts_user ON public.drafts USING btree (user_id);


--
-- Name: idx_feedback_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_category ON public.feedback USING btree (category);


--
-- Name: idx_feedback_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at);


--
-- Name: idx_material_favorites_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_favorites_user ON public.material_favorites USING btree (user_id);


--
-- Name: idx_materials_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_category ON public.materials USING btree (category);


--
-- Name: idx_materials_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_level ON public.materials USING btree (level);


--
-- Name: idx_participation_one_in_progress; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_participation_one_in_progress ON public.mock_exam_participations USING btree (user_id, mock_exam_id) WHERE ((status)::text = 'in_progress'::text);


--
-- Name: idx_questions_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_level ON public.questions USING btree (level);


--
-- Name: idx_questions_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_topic ON public.questions USING btree (topic);


--
-- Name: idx_questions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_type ON public.questions USING btree (type);


--
-- Name: idx_system_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_configs_key ON public.system_configs USING btree (config_key);


--
-- Name: idx_training_exercises_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_exercises_level ON public.training_exercises USING btree (level);


--
-- Name: idx_training_exercises_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_exercises_type ON public.training_exercises USING btree (type);


--
-- Name: idx_training_exercises_type_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_exercises_type_level ON public.training_exercises USING btree (type, level);


--
-- Name: idx_training_records_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_records_user ON public.training_records USING btree (user_id);


--
-- Name: drafts update_drafts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON public.drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: materials update_materials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_configs update_system_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_configs_updated_at BEFORE UPDATE ON public.system_configs FOR EACH ROW EXECUTE FUNCTION public.update_system_configs_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: checkins checkins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkins
    ADD CONSTRAINT checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: corrections corrections_draft_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES public.drafts(id) ON DELETE CASCADE;


--
-- Name: drafts drafts_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: drafts drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drafts
    ADD CONSTRAINT drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: material_favorites material_favorites_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_favorites
    ADD CONSTRAINT material_favorites_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: material_favorites material_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_favorites
    ADD CONSTRAINT material_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: materials materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: mock_exam_participations mock_exam_participations_mock_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_exam_participations
    ADD CONSTRAINT mock_exam_participations_mock_exam_id_fkey FOREIGN KEY (mock_exam_id) REFERENCES public.mock_exams(id) ON DELETE CASCADE;


--
-- Name: mock_exam_participations mock_exam_participations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mock_exam_participations
    ADD CONSTRAINT mock_exam_participations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_recipients notification_recipients_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_recipients notification_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_recipients
    ADD CONSTRAINT notification_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: questions questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: training_records training_records_exercise_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_records
    ADD CONSTRAINT training_records_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.training_exercises(id) ON DELETE SET NULL;


--
-- Name: training_records training_records_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_records
    ADD CONSTRAINT training_records_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE SET NULL;


--
-- Name: training_records training_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_records
    ADD CONSTRAINT training_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: training_resets training_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_resets
    ADD CONSTRAINT training_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2irviIQLzeZKXwHKZldmnXQkY5TY6LMbl17jL36mm6F3UOCbwMJO3BR2iAEpiHA

