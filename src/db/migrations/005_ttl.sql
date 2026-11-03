CREATE INDEX contas_ultimo_sincronismo_idx ON contas (ultimo_sincronismo);

CREATE TABLE avisos_ttl (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id UUID NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
    nivel VARCHAR(3) NOT NULL CHECK (nivel IN ('D30', 'D15', 'H48')),
    sincronismo_ref TIMESTAMP NOT NULL,
    enviado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (conta_id, nivel, sincronismo_ref)
);

GRANT ALL PRIVILEGES ON TABLE avisos_ttl TO krypta_user;
