-- =====================================================================
--  V1.1 — Schéma initial complet (installation sur une base vierge)
-- =====================================================================
--  Avant cette migration, le schéma n'existait que par Hibernate
--  (ddl-auto=update) : V2 à V12 ne faisaient rien sur une base vide et
--  V13 y échouait (ECART-04). Ce fichier crée toutes les tables dans
--  l'état qui précède V13 ; V2 à V13 s'appliquent ensuite sans effet
--  ou complètent (V13 ajoute public_id unique).
--
--  Bases existantes (prod, dev) : le schéma est déjà là, le bloc ne fait
--  rien. Flyway l'applique « hors ordre » (spring.flyway.out-of-order),
--  une seule fois, pour garder un historique identique partout.
--
--  Généré depuis les entités JPA (Hibernate 7, PostgreSQL 17) puis relu.
--  Les tables orphelines credit_compte / credit_transaction (ECART-43)
--  ne sont volontairement pas recréées.
--  Toute évolution passe désormais par une nouvelle migration Vn__.
-- =====================================================================

DO $$
BEGIN
    IF to_regclass('account') IS NOT NULL THEN
        RETURN;
    END IF;

        CREATE TABLE account (
            annonces_masquees boolean DEFAULT false NOT NULL,
            must_change_password boolean DEFAULT false NOT NULL,
            nb_avertissements integer DEFAULT 0 NOT NULL,
            activation_code_expiry bigint,
            created_at timestamp(6) without time zone,
            date_masquage_annonces timestamp(6) without time zone,
            date_suppression_definitive timestamp(6) without time zone,
            date_suppression_demandee timestamp(6) without time zone,
            password_changed_at bigint,
            reset_password_token_expiry bigint,
            entreprise_id uuid,
            id uuid NOT NULL,
            parent_user_id uuid,
            role_id uuid,
            telephone character varying(17),
            statut_piece_identite character varying(20),
            type_piece_identite character varying(20),
            statut character varying(30) NOT NULL,
            email character varying(50) NOT NULL,
            password character varying(120) NOT NULL,
            motif_masquage_annonces character varying(500),
            motif_statut character varying(500),
            piece_identite_url character varying(500),
            activation_code character varying(255),
            motif_rejet_piece_identite character varying(255),
            nom character varying(255),
            numero_piece_identite character varying(255),
            photo_profil character varying(255),
            prenom character varying(255),
            reset_password_token character varying(255),
            CONSTRAINT account_statut_check CHECK (((statut)::text = ANY ((ARRAY['EN_ATTENTE_ACTIVATION'::character varying, 'ACTIF'::character varying, 'INACTIF'::character varying, 'SUSPENDU'::character varying])::text[]))),
            CONSTRAINT account_statut_piece_identite_check CHECK (((statut_piece_identite)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'VALIDEE'::character varying, 'REJETEE'::character varying])::text[]))),
            CONSTRAINT account_type_piece_identite_check CHECK (((type_piece_identite)::text = ANY ((ARRAY['CARTE_IDENTITE'::character varying, 'PASSEPORT'::character varying, 'PERMIS_DE_CONDUIRE'::character varying, 'AUTRE'::character varying])::text[])))
        );
        CREATE TABLE account_favoris (
            annonce_id bigint NOT NULL,
            user_id uuid NOT NULL
        );
        CREATE TABLE annonce (
            actif boolean NOT NULL,
            frais_honoraire numeric(38,2) NOT NULL,
            latitude numeric(9,6),
            longitude numeric(9,6),
            prix numeric(38,2) NOT NULL,
            prix_revise numeric(38,2),
            relance_expiration_envoyee boolean DEFAULT false NOT NULL,
            date_cloture timestamp(6) without time zone,
            date_creation timestamp(6) without time zone NOT NULL,
            date_expiration timestamp(6) without time zone,
            date_modification timestamp(6) without time zone NOT NULL,
            id bigint NOT NULL,
            version bigint,
            vue_count bigint DEFAULT 0 NOT NULL,
            motif_cloture character varying(10),
            owner_id uuid NOT NULL,
            public_id character varying(16) NOT NULL,
            statut_moderation character varying(20) NOT NULL,
            type_annonce character varying(20) NOT NULL,
            type_bien character varying(30) NOT NULL,
            motif_moderation character varying(500),
            description character varying(2000) NOT NULL,
            complement_adresse character varying(255),
            documents_disponibles character varying(255) NOT NULL,
            localisation_id character varying(255) NOT NULL,
            reference_annonce character varying(255) NOT NULL,
            titre character varying(255) NOT NULL,
            CONSTRAINT annonce_motif_cloture_check CHECK (((motif_cloture)::text = ANY ((ARRAY['VENDU'::character varying, 'LOUE'::character varying, 'RETIRE'::character varying, 'EXPIREE'::character varying])::text[]))),
            CONSTRAINT annonce_statut_moderation_check CHECK (((statut_moderation)::text = ANY ((ARRAY['PUBLIEE'::character varying, 'MASQUEE'::character varying, 'REJETEE'::character varying, 'DESACTIVEE'::character varying])::text[]))),
            CONSTRAINT annonce_type_annonce_check CHECK (((type_annonce)::text = ANY ((ARRAY['VENTE'::character varying, 'LOCATION'::character varying, 'BAIL'::character varying])::text[]))),
            CONSTRAINT annonce_type_bien_check CHECK (((type_bien)::text = ANY ((ARRAY['APPARTEMENT'::character varying, 'MAISON'::character varying, 'VILLA'::character varying, 'TERRAIN'::character varying, 'DOMAINE'::character varying, 'MAGASIN'::character varying, 'BUREAU'::character varying, 'ENTREPOT'::character varying, 'AUTRE'::character varying])::text[])))
        );
        ALTER TABLE annonce ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME annonce_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE avertissements (
            suspendu_automatiquement boolean NOT NULL,
            date timestamp(6) without time zone NOT NULL,
            id bigint NOT NULL,
            utilisateur_id uuid NOT NULL,
            niveau character varying(20) NOT NULL,
            emit_par character varying(100) NOT NULL,
            motif character varying(200) NOT NULL,
            CONSTRAINT avertissements_niveau_check CHECK (((niveau)::text = ANY ((ARRAY['LEGER'::character varying, 'MODERE'::character varying, 'GRAVE'::character varying])::text[])))
        );
        ALTER TABLE avertissements ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME avertissements_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE bien_immo (
            nb_chambres integer,
            nb_pieces integer,
            nb_salles_bain integer,
            surface_total double precision,
            annonce_id bigint NOT NULL,
            type_usage character varying(30) NOT NULL,
            CONSTRAINT bien_immo_type_usage_check CHECK (((type_usage)::text = ANY ((ARRAY['AGRICOLE'::character varying, 'HABITATION'::character varying, 'COMMERCIAL'::character varying, 'LOISIR'::character varying, 'PROFESSIONNEL'::character varying, 'AUTRE'::character varying])::text[])))
        );
        CREATE TABLE conversation (
            active boolean NOT NULL,
            annonce_id bigint NOT NULL,
            created_at timestamp(6) without time zone NOT NULL,
            id bigint NOT NULL,
            last_message_at timestamp(6) without time zone NOT NULL,
            updated_at timestamp(6) without time zone NOT NULL,
            created_by_id uuid NOT NULL,
            participant_one_id uuid NOT NULL,
            participant_two_id uuid NOT NULL
        );
        ALTER TABLE conversation ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME conversation_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE entreprises (
            active boolean NOT NULL,
            quota_agents integer,
            quota_annonces integer,
            date_creation timestamp(6) without time zone NOT NULL,
            date_modification timestamp(6) without time zone,
            annonceur_professionnel_id uuid,
            id uuid NOT NULL,
            telephone character varying(17),
            numerorccm character varying(50),
            adresse character varying(100),
            email character varying(100),
            nom character varying(100) NOT NULL,
            description character varying(200),
            photo_profil character varying(500)
        );
        CREATE TABLE historique_annonce (
            annonce_id bigint NOT NULL,
            date_modification timestamp(6) without time zone NOT NULL,
            id bigint NOT NULL,
            champ character varying(60) NOT NULL,
            modifie_par character varying(100) NOT NULL,
            ancienne_valeur character varying(1000),
            nouvelle_valeur character varying(1000)
        );
        ALTER TABLE historique_annonce ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME historique_annonce_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE licence (
            date_debut date,
            date_fin date,
            created_at timestamp(6) without time zone NOT NULL,
            id bigint NOT NULL,
            owner_id uuid,
            type character varying(20) NOT NULL,
            cle character varying(32) NOT NULL,
            CONSTRAINT licence_type_check CHECK (((type)::text = ANY ((ARRAY['PARTICULIER'::character varying, 'PROFESSIONNEL'::character varying])::text[])))
        );
        ALTER TABLE licence ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME licence_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE localisation (
            commune character varying(255),
            id character varying(255) NOT NULL,
            prefecture character varying(255),
            quartier character varying(255),
            region character varying(255),
            type_commune character varying(255)
        );
        CREATE TABLE medias (
            ordre integer,
            annonce_id bigint NOT NULL,
            id bigint NOT NULL,
            type_mime character varying(255),
            url character varying(255)
        );
        ALTER TABLE medias ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME medias_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE message (
            signale boolean NOT NULL,
            supprime boolean NOT NULL,
            conversation_id bigint NOT NULL,
            created_at timestamp(6) without time zone NOT NULL,
            date_signalement timestamp(6) without time zone,
            date_suppression timestamp(6) without time zone,
            id bigint NOT NULL,
            read_at timestamp(6) without time zone,
            sender_id uuid NOT NULL,
            signale_par_id uuid,
            motif_signalement character varying(30),
            supprime_par character varying(100),
            content character varying(4000) NOT NULL,
            CONSTRAINT message_motif_signalement_check CHECK (((motif_signalement)::text = ANY ((ARRAY['ARNAQUE'::character varying, 'PROPOS_INSULTANTS'::character varying, 'HARCELEMENT'::character varying, 'SPAM'::character varying, 'AUTRE'::character varying])::text[])))
        );
        ALTER TABLE message ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME message_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        CREATE TABLE parametre_plateforme (
            cle character varying(100) NOT NULL,
            valeur character varying(255) NOT NULL
        );
        CREATE TABLE roles (
            id uuid NOT NULL,
            name character varying(20),
            CONSTRAINT roles_name_check CHECK (((name)::text = ANY ((ARRAY['PARTICULIER'::character varying, 'PROFESSIONNEL'::character varying, 'AGENT_PROFESSIONNEL'::character varying, 'MODERATEUR'::character varying, 'ADMINISTRATEUR'::character varying])::text[])))
        );
        CREATE TABLE signalements (
            annule boolean NOT NULL,
            annonce_id bigint NOT NULL,
            date timestamp(6) without time zone NOT NULL,
            date_annulation timestamp(6) without time zone,
            date_traitement timestamp(6) without time zone,
            id bigint NOT NULL,
            reporter_id uuid NOT NULL,
            statut character varying(20) NOT NULL,
            motif character varying(100) NOT NULL,
            commentaire text,
            note_admin text,
            traite_par character varying(255),
            CONSTRAINT signalements_statut_check CHECK (((statut)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'TRAITE'::character varying, 'IGNORE'::character varying])::text[])))
        );
        ALTER TABLE signalements ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME signalements_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
        ALTER TABLE ONLY account
            ADD CONSTRAINT account_email_key UNIQUE (email);
        ALTER TABLE ONLY account_favoris
            ADD CONSTRAINT account_favoris_pkey PRIMARY KEY (annonce_id, user_id);
        ALTER TABLE ONLY account
            ADD CONSTRAINT account_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY account
            ADD CONSTRAINT account_telephone_key UNIQUE (telephone);
        ALTER TABLE ONLY annonce
            ADD CONSTRAINT annonce_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY annonce
            ADD CONSTRAINT annonce_reference_annonce_key UNIQUE (reference_annonce);
        ALTER TABLE ONLY avertissements
            ADD CONSTRAINT avertissements_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY bien_immo
            ADD CONSTRAINT bien_immo_pkey PRIMARY KEY (annonce_id);
        ALTER TABLE ONLY conversation
            ADD CONSTRAINT conversation_annonce_id_participant_one_id_participant_two__key UNIQUE (annonce_id, participant_one_id, participant_two_id);
        ALTER TABLE ONLY conversation
            ADD CONSTRAINT conversation_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY entreprises
            ADD CONSTRAINT entreprises_annonceur_professionnel_id_key UNIQUE (annonceur_professionnel_id);
        ALTER TABLE ONLY entreprises
            ADD CONSTRAINT entreprises_numerorccm_key UNIQUE (numerorccm);
        ALTER TABLE ONLY entreprises
            ADD CONSTRAINT entreprises_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY entreprises
            ADD CONSTRAINT entreprises_telephone_key UNIQUE (telephone);
        ALTER TABLE ONLY historique_annonce
            ADD CONSTRAINT historique_annonce_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY licence
            ADD CONSTRAINT licence_cle_key UNIQUE (cle);
        ALTER TABLE ONLY licence
            ADD CONSTRAINT licence_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY localisation
            ADD CONSTRAINT localisation_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY medias
            ADD CONSTRAINT medias_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY message
            ADD CONSTRAINT message_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY parametre_plateforme
            ADD CONSTRAINT parametre_plateforme_pkey PRIMARY KEY (cle);
        ALTER TABLE ONLY roles
            ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY signalements
            ADD CONSTRAINT signalements_pkey PRIMARY KEY (id);
        ALTER TABLE ONLY signalements
            ADD CONSTRAINT uq_signalement_annonce_reporter UNIQUE (annonce_id, reporter_id);
        CREATE INDEX idx_annonce_actif ON annonce USING btree (actif);
        CREATE INDEX idx_annonce_date_creation ON annonce USING btree (date_creation);
        CREATE INDEX idx_annonce_localisation ON annonce USING btree (localisation_id);
        CREATE INDEX idx_annonce_owner ON annonce USING btree (owner_id);
        CREATE INDEX idx_avertissement_date ON avertissements USING btree (date);
        CREATE INDEX idx_avertissement_utilisateur ON avertissements USING btree (utilisateur_id);
        CREATE INDEX idx_conversation_annonce ON conversation USING btree (annonce_id);
        CREATE INDEX idx_conversation_last_message_at ON conversation USING btree (last_message_at);
        CREATE INDEX idx_conversation_participant_one ON conversation USING btree (participant_one_id);
        CREATE INDEX idx_conversation_participant_two ON conversation USING btree (participant_two_id);
        CREATE INDEX idx_licence_owner ON licence USING btree (owner_id);
        CREATE INDEX idx_message_conversation ON message USING btree (conversation_id);
        CREATE INDEX idx_message_created_at ON message USING btree (created_at);
        CREATE INDEX idx_message_sender ON message USING btree (sender_id);
        CREATE INDEX idx_signalement_annonce ON signalements USING btree (annonce_id);
        CREATE INDEX idx_signalement_reporter ON signalements USING btree (reporter_id);
        CREATE INDEX idx_signalement_statut ON signalements USING btree (statut);
        ALTER TABLE ONLY signalements
            ADD CONSTRAINT fk4gy5pcm44k4u684s8a65suedq FOREIGN KEY (reporter_id) REFERENCES account(id);
        ALTER TABLE ONLY message
            ADD CONSTRAINT fk5k0olkd82xhjehyhuy44pqi4c FOREIGN KEY (sender_id) REFERENCES account(id);
        ALTER TABLE ONLY conversation
            ADD CONSTRAINT fk5pxbqc2te3a2t4p2rm3v5itac FOREIGN KEY (participant_one_id) REFERENCES account(id);
        ALTER TABLE ONLY licence
            ADD CONSTRAINT fk691lslhsxswf03titd7e838la FOREIGN KEY (owner_id) REFERENCES account(id);
        ALTER TABLE ONLY account
            ADD CONSTRAINT fk6hf4t5soje4dja93gi5dnwdnf FOREIGN KEY (parent_user_id) REFERENCES account(id);
        ALTER TABLE ONLY message
            ADD CONSTRAINT fk6yskk3hxw5sklwgi25y6d5u1l FOREIGN KEY (conversation_id) REFERENCES conversation(id);
        ALTER TABLE ONLY historique_annonce
            ADD CONSTRAINT fk7h6mwc9c7uijonlpwxo6qvo74 FOREIGN KEY (annonce_id) REFERENCES annonce(id);
        ALTER TABLE ONLY account_favoris
            ADD CONSTRAINT fka4yf83rm16f31r3ukh087pf0b FOREIGN KEY (annonce_id) REFERENCES annonce(id);
        ALTER TABLE ONLY conversation
            ADD CONSTRAINT fkbveb0syq4qd0b4vpc1f1r7gbx FOREIGN KEY (created_by_id) REFERENCES account(id);
        ALTER TABLE ONLY account_favoris
            ADD CONSTRAINT fkc8dehaix8i6tdii3ukbuf4ohb FOREIGN KEY (user_id) REFERENCES account(id);
        ALTER TABLE ONLY annonce
            ADD CONSTRAINT fke3c2s7m03w01iopwdeiuuebp7 FOREIGN KEY (owner_id) REFERENCES account(id);
        ALTER TABLE ONLY bien_immo
            ADD CONSTRAINT fkejdp6yxj1co25fol2bst1a35p FOREIGN KEY (annonce_id) REFERENCES annonce(id);
        ALTER TABLE ONLY message
            ADD CONSTRAINT fk_message_signale_par FOREIGN KEY (signale_par_id) REFERENCES account(id) ON DELETE SET NULL;
        ALTER TABLE ONLY account
            ADD CONSTRAINT fkg32ymmh9obv1db821xi4128k5 FOREIGN KEY (entreprise_id) REFERENCES entreprises(id);
        ALTER TABLE ONLY account
            ADD CONSTRAINT fkgdpd8e1vs356bjg287jr27pl7 FOREIGN KEY (role_id) REFERENCES roles(id);
        ALTER TABLE ONLY conversation
            ADD CONSTRAINT fkkvp5ncfo1n9v110gxp9h2cwc7 FOREIGN KEY (participant_two_id) REFERENCES account(id);
        ALTER TABLE ONLY avertissements
            ADD CONSTRAINT fkl5rfsqb0uohf1i8pq22xvdm9e FOREIGN KEY (utilisateur_id) REFERENCES account(id);
        ALTER TABLE ONLY conversation
            ADD CONSTRAINT fkne1068f6gq6725kifa2c9qw7a FOREIGN KEY (annonce_id) REFERENCES annonce(id);
        ALTER TABLE ONLY entreprises
            ADD CONSTRAINT fkpmba74j7x2nx6p37pg10xyfvb FOREIGN KEY (annonceur_professionnel_id) REFERENCES account(id);
        ALTER TABLE ONLY signalements
            ADD CONSTRAINT fkqp6w88fqof77du3i3yslm108c FOREIGN KEY (annonce_id) REFERENCES annonce(id);
        ALTER TABLE ONLY medias
            ADD CONSTRAINT fkr6a51tmblbfvxjhwn1n0adrp8 FOREIGN KEY (annonce_id) REFERENCES annonce(id);
        ALTER TABLE ONLY annonce
            ADD CONSTRAINT fkst3ij236rkj64bocllvianlih FOREIGN KEY (localisation_id) REFERENCES localisation(id);
END $$;
