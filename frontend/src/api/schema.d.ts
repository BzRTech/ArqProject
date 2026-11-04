// Arquivo GERADO por `npm run gen:api`. Não edite à mão.

export interface paths {
    "/api/assets/{asset_id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["assets_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/assets/{asset_id}/complete/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Confirma que o envio terminou (o servidor confere no S3). */
        post: operations["assets_complete_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/assets/presign/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Reserva um arquivo e devolve a URL para o navegador enviá-lo direto ao S3 (PUT). */
        post: operations["assets_presign_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/csrf/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Entrega o cookie `csrftoken` (o front o devolve em X-CSRFToken). */
        get: operations["auth_csrf_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["auth_login_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["auth_logout_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/me/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["auth_me_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/signup/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Cria a conta e o escritório (o usuário vira dono). Desligável com ALLOW_SIGNUP. */
        post: operations["auth_signup_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Verifica se a API e o banco de dados estão respondendo. */
        get: operations["health_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/library/{kind}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Linhas de um banco: globais e do escritório (para a tela "Banco do escritório"). */
        get: operations["library_list"];
        put?: never;
        /** @description Linhas de um banco: globais e do escritório (para a tela "Banco do escritório"). */
        post: operations["library_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/library/{kind}/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["library_retrieve"];
        put: operations["library_update"];
        post?: never;
        delete: operations["library_destroy"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/library/{kind}/{id}/override/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Personalizar uma entrada global: cópia no banco do escritório, com o mesmo id. */
        post: operations["library_override_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/library/{kind}/import/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Importa uma planilha (CSV/XLSX) para o banco do escritório. */
        post: operations["library_import_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/library/bundle/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Tudo o que o editor precisa dos bancos numa chamada (global + escritório), com ETag. */
        get: operations["library_bundle_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orgs/current/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Escritório ativo com a "Minha marca" (logo, cor, contato). Só o dono altera. */
        get: operations["orgs_current_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Escritório ativo com a "Minha marca" (logo, cor, contato). Só o dono altera. */
        patch: operations["orgs_current_partial_update"];
        trace?: never;
    };
    "/api/orgs/switch/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["orgs_switch_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        get: operations["projects_list"];
        put?: never;
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        post: operations["projects_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{id}/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        get: operations["projects_retrieve"];
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        put: operations["projects_update"];
        post?: never;
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        delete: operations["projects_destroy"];
        options?: never;
        head?: never;
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        patch: operations["projects_partial_update"];
        trace?: never;
    };
    "/api/projects/{id}/duplicate/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        post: operations["projects_duplicate_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{id}/memorial.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Memorial descritivo em PDF (itens por ambiente e disciplina, com a marca). */
        get: operations["projects_memorial.pdf_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{id}/versions/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        get: operations["projects_versions_list"];
        put?: never;
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        post: operations["projects_versions_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{id}/versions/{version_id}/restore/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description Projetos do escritório ativo. Nada de outro escritório aparece (404). */
        post: operations["projects_versions_restore_create"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Asset: {
            /** Format: uuid */
            readonly id: string;
            /** Nome do arquivo */
            filename: string;
            /** Tipo */
            content_type: string;
            /**
             * Tamanho (bytes)
             * Format: int64
             */
            size_bytes: number;
            status?: components["schemas"]["AssetStatusEnum"];
            /**
             * Criado em
             * Format: date-time
             */
            readonly created_at: string;
            /** @description URL temporária (1 h) para baixar; nula enquanto o envio não termina. */
            readonly url: string | null;
        };
        /**
         * @description * `pending` - aguardando envio
         *     * `ready` - pronto
         * @enum {string}
         */
        AssetStatusEnum: "pending" | "ready";
        /** @description Escritório com a "Minha marca" (só o dono altera). */
        Brand: {
            readonly id: number;
            /** Nome */
            name: string;
            /** Identificador */
            readonly slug: string;
            /** Format: uuid */
            logo?: string | null;
            /** @description URL temporária do logo (para a tela e para o PDF). */
            readonly logo_url: string | null;
            brand_color?: string;
            /** Telefone */
            phone?: string;
            /** E-mail de contato */
            email?: string;
            /** Site */
            website?: string;
            /** Endereço */
            address?: string;
            /**
             * Registro profissional
             * @description Ex.: CAU A12345-6
             */
            registration?: string;
        };
        Bundle: {
            etag: string;
            /** @description Por banco: disciplines, items, materials, floors, handles, hardware, joinery-types, presets, rules, details, sheet-templates, spec-templates. */
            kinds: {
                [key: string]: {
                    [key: string]: unknown;
                }[];
            };
        };
        Conflict: {
            detail: string;
            revision: number;
            /** Format: date-time */
            updated_at: string;
            updated_by_name: string | null;
        };
        Health: {
            status: string;
            database: string;
        };
        ImportReport: {
            criados: number;
            atualizados: number;
            iguais: number;
            erros: string[];
        };
        ImportRequestRequest: {
            /** Format: binary */
            file: string;
            /** @default false */
            dry_run: boolean;
        };
        /** @description Uma linha do banco (global ou do escritório), com a entrada no formato do front. */
        LibraryRow: {
            pk: number;
            scope: components["schemas"]["ScopeEnum"];
            /** @description Global que o escritório personalizou (vale a do escritório). */
            overridden: boolean;
            /** @description Do escritório, no lugar de uma global. */
            overrides: boolean;
            is_active: boolean;
            /** Format: date-time */
            updated_at: string;
            entry: {
                [key: string]: unknown;
            };
        };
        LibraryWriteRequest: {
            /** @description Entrada no formato do front (id, name, …). */
            entry: {
                [key: string]: unknown;
            };
            is_active?: boolean;
        };
        LoginRequest: {
            /** Format: email */
            email: string;
            password: string;
        };
        Me: {
            id: number;
            /** Format: email */
            email: string;
            name: string;
            is_staff: boolean;
            organization: components["schemas"]["Organization"] | null;
            role: (components["schemas"]["RoleEnum"] | components["schemas"]["NullEnum"]) | null;
            memberships: components["schemas"]["Membership"][];
        };
        Membership: {
            readonly organization: components["schemas"]["Organization"];
            /** Papel */
            role?: components["schemas"]["RoleEnum"];
        };
        /** @enum {unknown} */
        NullEnum: null;
        Organization: {
            readonly id: number;
            /** Nome */
            name: string;
            /** Identificador */
            readonly slug: string;
        };
        /** @description Escritório com a "Minha marca" (só o dono altera). */
        PatchedBrandRequest: {
            /** Nome */
            name?: string;
            /** Format: uuid */
            logo?: string | null;
            brand_color?: string;
            /** Telefone */
            phone?: string;
            /** E-mail de contato */
            email?: string;
            /** Site */
            website?: string;
            /** Endereço */
            address?: string;
            /**
             * Registro profissional
             * @description Ex.: CAU A12345-6
             */
            registration?: string;
        };
        /** @description PATCH: dados fora do documento (não mexem na revisão). */
        PatchedProjectMetaRequest: {
            /** Cliente */
            client_name?: string;
            status?: components["schemas"]["ProjectStatusEnum"];
        };
        PresignRequestRequest: {
            filename: string;
            content_type: string;
            size: number;
        };
        PresignResponse: {
            asset: components["schemas"]["Asset"];
            /** Format: uri */
            upload_url: string;
            method: string;
            headers: {
                [key: string]: string;
            };
        };
        ProjectCreateRequest: {
            /** @description Documento completo (formato atual). */
            data: unknown;
            /** @description Relatório do memorial (calculado pelo editor). */
            report?: unknown;
            client_name?: string;
            status?: components["schemas"]["ProjectStatusEnum"];
        };
        ProjectDetail: {
            /** Format: uuid */
            readonly id: string;
            /** Nome */
            readonly name: string;
            /** Cliente */
            readonly client_name: string;
            readonly status: components["schemas"]["ProjectStatusEnum"];
            /** Revisão */
            readonly revision: number;
            /** Versão do formato */
            readonly schema_version: number;
            /** Documento */
            readonly data: unknown;
            readonly has_report: boolean;
            /**
             * Criado em
             * Format: date-time
             */
            readonly created_at: string;
            /**
             * Alterado em
             * Format: date-time
             */
            readonly updated_at: string;
            readonly updated_by_name: string | null;
        };
        ProjectList: {
            /** Format: uuid */
            readonly id: string;
            /** Nome */
            readonly name: string;
            /** Cliente */
            readonly client_name: string;
            readonly status: components["schemas"]["ProjectStatusEnum"];
            /** Revisão */
            readonly revision: number;
            /** Versão do formato */
            readonly schema_version: number;
            readonly environment_count: number | null;
            /**
             * Criado em
             * Format: date-time
             */
            readonly created_at: string;
            /**
             * Alterado em
             * Format: date-time
             */
            readonly updated_at: string;
            readonly updated_by_name: string | null;
        };
        /** @description PUT: o documento inteiro. Exige o cabeçalho `If-Match: <revision>`. */
        ProjectSaveRequest: {
            data: unknown;
            /** @description Relatório do memorial (calculado pelo editor). */
            report?: unknown;
        };
        /**
         * @description * `draft` - rascunho
         *     * `review` - em aprovação
         *     * `approved` - aprovado
         *     * `archived` - arquivado
         * @enum {string}
         */
        ProjectStatusEnum: "draft" | "review" | "approved" | "archived";
        /**
         * @description * `owner` - dono
         *     * `editor` - editor
         *     * `viewer` - leitor
         * @enum {string}
         */
        RoleEnum: "owner" | "editor" | "viewer";
        /**
         * @description * `global` - global
         *     * `org` - escritório
         * @enum {string}
         */
        ScopeEnum: "global" | "org";
        SignUpRequest: {
            name: string;
            /** Format: email */
            email: string;
            password: string;
            organization_name: string;
        };
        SwitchOrganizationRequest: {
            organization: number;
        };
        Version: {
            readonly id: number;
            /** Revisão */
            readonly revision: number;
            /** Versão do formato */
            readonly schema_version: number;
            /** Nome */
            readonly label: string;
            readonly kind: components["schemas"]["VersionKindEnum"];
            /**
             * Criada em
             * Format: date-time
             */
            readonly created_at: string;
            readonly created_by_name: string | null;
        };
        VersionCreateRequest: {
            label: string;
        };
        /**
         * @description * `auto` - automática
         *     * `manual` - salva pelo usuário
         *     * `restore` - antes de restaurar
         * @enum {string}
         */
        VersionKindEnum: "auto" | "manual" | "restore";
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    assets_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                asset_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Asset"];
                };
            };
        };
    };
    assets_complete_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                asset_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Asset"];
                };
            };
        };
    };
    assets_presign_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PresignRequestRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PresignRequestRequest"];
                "multipart/form-data": components["schemas"]["PresignRequestRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PresignResponse"];
                };
            };
        };
    };
    auth_csrf_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    auth_login_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["LoginRequest"];
                "multipart/form-data": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
        };
    };
    auth_logout_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    auth_me_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
        };
    };
    auth_signup_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SignUpRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["SignUpRequest"];
                "multipart/form-data": components["schemas"]["SignUpRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
        };
    };
    health_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    library_list: {
        parameters: {
            query?: {
                scope?: "all" | "global" | "org";
                search?: string;
            };
            header?: never;
            path: {
                /** @description Banco. */
                kind: "details" | "disciplines" | "floors" | "handles" | "hardware" | "items" | "joinery-types" | "materials" | "presets" | "rules" | "sheet-templates" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryRow"][];
                };
            };
        };
    };
    library_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Banco. */
                kind: "details" | "disciplines" | "floors" | "handles" | "hardware" | "items" | "joinery-types" | "materials" | "presets" | "rules" | "sheet-templates" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LibraryWriteRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["LibraryWriteRequest"];
                "multipart/form-data": components["schemas"]["LibraryWriteRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryRow"];
                };
            };
        };
    };
    library_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                /** @description Banco. */
                kind: "details" | "disciplines" | "floors" | "handles" | "hardware" | "items" | "joinery-types" | "materials" | "presets" | "rules" | "sheet-templates" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryRow"];
                };
            };
        };
    };
    library_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                /** @description Banco. */
                kind: "details" | "disciplines" | "floors" | "handles" | "hardware" | "items" | "joinery-types" | "materials" | "presets" | "rules" | "sheet-templates" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LibraryWriteRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["LibraryWriteRequest"];
                "multipart/form-data": components["schemas"]["LibraryWriteRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryRow"];
                };
            };
        };
    };
    library_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                /** @description Banco. */
                kind: "details" | "disciplines" | "floors" | "handles" | "hardware" | "items" | "joinery-types" | "materials" | "presets" | "rules" | "sheet-templates" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    library_override_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
                /** @description Banco. */
                kind: "details" | "disciplines" | "floors" | "handles" | "hardware" | "items" | "joinery-types" | "materials" | "presets" | "rules" | "sheet-templates" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LibraryRow"];
                };
            };
        };
    };
    library_import_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                kind: "floors" | "handles" | "hardware" | "materials" | "spec-templates";
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ImportRequestRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ImportReport"];
                };
            };
        };
    };
    library_bundle_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Bundle"];
                };
            };
            /** @description No response body */
            304: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    orgs_current_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Brand"];
                };
            };
        };
    };
    orgs_current_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedBrandRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedBrandRequest"];
                "multipart/form-data": components["schemas"]["PatchedBrandRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Brand"];
                };
            };
        };
    };
    orgs_switch_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SwitchOrganizationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["SwitchOrganizationRequest"];
                "multipart/form-data": components["schemas"]["SwitchOrganizationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
        };
    };
    projects_list: {
        parameters: {
            query?: {
                /** @description Nome ou cliente. */
                search?: string;
                /** @description draft|review|approved|archived|all (padrão: tudo menos arquivados). */
                status?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectList"][];
                };
            };
        };
    };
    projects_create: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectCreateRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ProjectCreateRequest"];
                "multipart/form-data": components["schemas"]["ProjectCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
        };
    };
    projects_retrieve: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
        };
    };
    projects_update: {
        parameters: {
            query?: never;
            header: {
                /** @description Revisão que o editor tem (ETag recebido no GET). */
                "If-Match": string;
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectSaveRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["ProjectSaveRequest"];
                "multipart/form-data": components["schemas"]["ProjectSaveRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Conflict"];
                };
            };
        };
    };
    projects_destroy: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No response body */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    projects_partial_update: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["PatchedProjectMetaRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedProjectMetaRequest"];
                "multipart/form-data": components["schemas"]["PatchedProjectMetaRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectList"];
                };
            };
        };
    };
    projects_duplicate_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectList"];
                };
            };
        };
    };
    "projects_memorial.pdf_retrieve": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/pdf": string;
                };
            };
        };
    };
    projects_versions_list: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Version"][];
                };
            };
        };
    };
    projects_versions_create: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["VersionCreateRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["VersionCreateRequest"];
                "multipart/form-data": components["schemas"]["VersionCreateRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Version"];
                };
            };
        };
    };
    projects_versions_restore_create: {
        parameters: {
            query?: never;
            header: {
                /** @description Revisão que o editor tem (ETag recebido no GET). */
                "If-Match": string;
            };
            path: {
                id: string;
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectDetail"];
                };
            };
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Conflict"];
                };
            };
        };
    };
}
