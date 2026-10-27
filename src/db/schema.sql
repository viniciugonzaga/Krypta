--
-- PostgreSQL database dump
--

\restrict tA5Jzujfzie7XPZHkZyAtQuR3SfyuvOtGfviUvrJRw6e0IWcnr0HCcZLbN9cbTL

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conta_id uuid NOT NULL,
    payload_cifrado bytea NOT NULL,
    version_counter integer NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: chaves_revogadas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chaves_revogadas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    public_key text NOT NULL,
    conta_id uuid,
    motivo character varying(30) NOT NULL,
    revogada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chaves_revogadas_motivo_check CHECK (((motivo)::text = ANY ((ARRAY['KILL_SWITCH_DONO'::character varying, 'KILL_SWITCH_HERDEIRO'::character varying])::text[])))
);


--
-- Name: contas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    public_key text,
    status character varying(30) DEFAULT 'PENDENTE_PAREAMENTO'::character varying NOT NULL,
    hash_cont_dono text,
    hash_cont_herdeiro text,
    ultimo_sincronismo timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    senha_admin_hash text NOT NULL,
    CONSTRAINT contas_status_check CHECK (((status)::text = ANY ((ARRAY['PENDENTE_PAREAMENTO'::character varying, 'ATIVA'::character varying, 'REVOGADA'::character varying, 'RECUPERACAO_LOCAL'::character varying, 'RECUPERACAO_HARDWARE'::character varying])::text[])))
);


--
-- Name: backups backups_conta_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_conta_id_key UNIQUE (conta_id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: chaves_revogadas chaves_revogadas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chaves_revogadas
    ADD CONSTRAINT chaves_revogadas_pkey PRIMARY KEY (id);


--
-- Name: chaves_revogadas chaves_revogadas_public_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chaves_revogadas
    ADD CONSTRAINT chaves_revogadas_public_key_key UNIQUE (public_key);


--
-- Name: contas contas_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_email_key UNIQUE (email);


--
-- Name: contas contas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_pkey PRIMARY KEY (id);


--
-- Name: contas contas_public_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_public_key_key UNIQUE (public_key);


--
-- Name: backups backups_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE CASCADE;


--
-- Name: chaves_revogadas chaves_revogadas_conta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chaves_revogadas
    ADD CONSTRAINT chaves_revogadas_conta_id_fkey FOREIGN KEY (conta_id) REFERENCES public.contas(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict tA5Jzujfzie7XPZHkZyAtQuR3SfyuvOtGfviUvrJRw6e0IWcnr0HCcZLbN9cbTL

