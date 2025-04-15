-- Inserir usuário admin
INSERT INTO users (email, password, role) 
VALUES ('admin@admin.com.br', '$2a$10$YourHashedPasswordHere', 'admin');

-- Inserir usuário anunciante
INSERT INTO users (email, password, role) 
VALUES ('ad@ad.com.br', '$2a$10$YourHashedPasswordHere', 'anunciante'); 