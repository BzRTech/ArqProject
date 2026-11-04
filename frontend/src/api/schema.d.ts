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
    "/api/orgs/current/": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Escritório ativo. Só o dono altera (a "Minha marca" completa vem na Fase 6). */
        get: operations["orgs_current_retrieve"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** @description Escritório ativo. Só o dono altera (a "Minha marca" completa vem na Fase 6). */
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
        PatchedOrganizationRequest: {
            /** Nome */
            name?: string;
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
                    "application/json": components["schemas"]["Organization"];
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
                "application/json": components["schemas"]["PatchedOrganizationRequest"];
                "application/x-www-form-urlencoded": components["schemas"]["PatchedOrganizationRequest"];
                "multipart/form-data": components["schemas"]["PatchedOrganizationRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Organization"];
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
