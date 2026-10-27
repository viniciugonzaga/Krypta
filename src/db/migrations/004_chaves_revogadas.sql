CREATE TABLE chaves_revogadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_key TEXT NOT NULL UNIQUE,
    conta_id UUID REFERENCES contas(id) ON DELETE SET NULL,
    motivo VARCHAR(30) NOT NULL
        CHECK (motivo IN ('KILL_SWITCH_DONO', 'KILL_SWITCH_HERDEIRO')),
    revogada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

GRANT ALL PRIVILEGES ON TABLE chaves_revogadas TO krypta_user;
