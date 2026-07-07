--
-- PostgreSQL database dump
--

\restrict IoiLINmRHbLe5pvC7CX025Gt24iqsmFbot6P0ygzrMKQRroA17VZhmDfhM055No

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    campaign_type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    target_audience jsonb,
    coupon_id character varying,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone,
    email_subject text,
    email_content text,
    sent_count integer DEFAULT 0 NOT NULL,
    open_count integer DEFAULT 0 NOT NULL,
    click_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    product_id character varying NOT NULL,
    variant_id character varying,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    image text,
    display_order integer DEFAULT 0 NOT NULL
);


--
-- Name: coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_redemptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    coupon_id character varying NOT NULL,
    order_id character varying NOT NULL,
    user_id character varying,
    discount_amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2),
    max_discount_amount numeric(10,2),
    usage_limit integer,
    usage_count integer DEFAULT 0 NOT NULL,
    per_user_limit integer DEFAULT 1,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_influencer_code boolean DEFAULT false NOT NULL,
    influencer_name text,
    influencer_instagram text,
    commission_type text,
    commission_value numeric(10,2),
    total_commission_earned numeric(10,2) DEFAULT '0'::numeric,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp without time zone,
    free_shipping boolean DEFAULT false NOT NULL,
    applies_to_shipping boolean DEFAULT false NOT NULL
);


--
-- Name: dealers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dealers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    contact_person text NOT NULL,
    address text,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_jobs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    campaign_id character varying,
    recipient_email text NOT NULL,
    recipient_name text,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp without time zone,
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    product_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: influencer_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.influencer_payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    coupon_id character varying NOT NULL,
    amount numeric(10,2) NOT NULL,
    note text,
    paid_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: low_stock_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.low_stock_alerts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    variant_id character varying NOT NULL,
    threshold integer DEFAULT 5 NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    last_notified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    marketplace_id character varying NOT NULL,
    external_id text NOT NULL,
    name text NOT NULL,
    parent_external_id text,
    site_category_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    full_path text
);


--
-- Name: marketplace_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    marketplace_id character varying NOT NULL,
    external_id text NOT NULL,
    external_product_code text,
    product_id character varying,
    image_hashes jsonb DEFAULT '[]'::jsonb NOT NULL,
    content_hash text,
    last_synced_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_sync_runs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    marketplace_id character varying NOT NULL,
    mode text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    trigger text DEFAULT 'manual'::text NOT NULL,
    stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    error_summary jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: marketplaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplaces (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    encrypted_credentials text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_full_sync_at timestamp without time zone,
    last_delta_sync_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    category_tree_fetched_at timestamp without time zone
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    category_id character varying,
    url text,
    parent_id character varying,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    open_in_new_tab boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    product_id character varying,
    variant_id character varying,
    product_name text NOT NULL,
    variant_details text,
    price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(10,2) NOT NULL
);


--
-- Name: order_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    author_id character varying,
    author_type text DEFAULT 'admin'::text NOT NULL,
    note_type text DEFAULT 'general'::text NOT NULL,
    content text NOT NULL,
    is_private boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    shipping_address jsonb NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    shipping_cost numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    discount_amount numeric(10,2) DEFAULT '0'::numeric,
    coupon_code text,
    tracking_number text,
    tracking_url text,
    shipping_carrier text,
    invoice_url text
);


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    is_published boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: pending_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_payments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    merchant_oid text NOT NULL,
    session_id text NOT NULL,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    shipping_address jsonb NOT NULL,
    cart_items jsonb NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    shipping_cost numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT '0'::numeric,
    coupon_code text,
    total numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_token text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    create_account boolean DEFAULT false,
    account_password_hash text,
    client_ip text,
    client_user_agent text,
    iyzico_payment_id text
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    category_id character varying NOT NULL
);


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    user_id character varying,
    rating integer NOT NULL,
    title text,
    content text,
    is_approved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    guest_name text,
    guest_email text,
    rejection_reason text,
    approved_at timestamp without time zone,
    approved_by character varying
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    product_id character varying NOT NULL,
    sku text,
    size text,
    color text,
    color_hex text,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    category_id character varying,
    base_price numeric(10,2) NOT NULL,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_new boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    sku text,
    available_sizes jsonb DEFAULT '[]'::jsonb NOT NULL,
    available_colors jsonb DEFAULT '[]'::jsonb NOT NULL,
    discount_badge text
);


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    quote_id character varying NOT NULL,
    product_id character varying,
    variant_id character varying,
    product_name text NOT NULL,
    product_image text,
    variant_details text,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    line_total numeric(10,2) NOT NULL,
    product_sku text
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    quote_number text NOT NULL,
    dealer_id character varying NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    valid_until timestamp without time zone,
    payment_terms text,
    notes text,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount_total numeric(10,2) DEFAULT 0 NOT NULL,
    grand_total numeric(10,2) DEFAULT 0 NOT NULL,
    includes_vat boolean DEFAULT true NOT NULL,
    sent_at timestamp without time zone,
    accepted_at timestamp without time zone,
    rejected_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying,
    admin_user_id character varying,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    revoked_at timestamp without time zone,
    user_agent text,
    ip_address text
);


--
-- Name: review_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    order_id character varying NOT NULL,
    user_id character varying NOT NULL,
    sent_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: size_charts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.size_charts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    category_id character varying NOT NULL,
    columns jsonb DEFAULT '[]'::jsonb NOT NULL,
    rows jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_adjustments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    variant_id character varying NOT NULL,
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    adjustment_type text NOT NULL,
    reason text,
    author_id character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: user_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_addresses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    title text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    district text NOT NULL,
    postal_code text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    country text DEFAULT 'Türkiye'::text NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    first_name text,
    last_name text,
    phone text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    address text,
    city text,
    district text,
    postal_code text,
    country text DEFAULT 'Türkiye'::text
);


--
-- Name: woocommerce_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.woocommerce_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    site_url text NOT NULL,
    consumer_key text NOT NULL,
    consumer_secret text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_sync timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: woocommerce_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.woocommerce_sync_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    status text NOT NULL,
    products_imported integer DEFAULT 0 NOT NULL,
    categories_imported integer DEFAULT 0 NOT NULL,
    images_downloaded integer DEFAULT 0 NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone
);


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_users (id, username, password, created_at) FROM stdin;
2a866f13-67d0-43cf-8139-c6eb2266126e	polenstone	$2b$10$KZbUzQaSyzx7mHuE3.LCoe3fgEfZxqbwFgaDpyyMa97a5rFntP9/G	2026-04-27 01:19:36.994516
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.campaigns (id, name, description, campaign_type, status, target_audience, coupon_id, starts_at, ends_at, email_subject, email_content, sent_count, open_count, click_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, session_id, product_id, variant_id, quantity, created_at) FROM stdin;
b53dafe9-5ba0-4b92-a0d1-1f037da68ca7	6382671e50b5bee6acd49f48e64f99876dbe63c963f1d784cfe9f8019dabe34f	c70ece06-707f-447e-a92a-45c83428436c	02cdf129-9154-4b40-b980-0a6c843b9437	1	2026-07-07 09:27:17.191018
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, image, display_order) FROM stdin;
9ad27dda-5d85-4585-bf24-691167d18b81	Tüm Ürünler	tum-urunler	\N	28
0a185759-ad4a-4c69-9407-4ba8a07d6e66	Mangal Aksesuarları	mangal-aksesuarlari	\N	29
e01b0a1e-c7ab-4fb7-8dc9-918b51f93ee9	Kömür & Tutuşturucu	komur-tutusturucu	\N	30
edc81b9c-2ac1-4427-837c-fd5a0e8210fa	Eşofman	esofman	/uploads/categories/esofman-1767895298681.jpg	101
93f5cc73-8433-4a83-8358-59a4bf4517c3	Şalvar & Pantolon	salvar-pantolon	/uploads/categories/salvar-pantolon-1767895298922.jpg	102
1168b602-9a50-4455-9bf7-e3eb88fdde87	Sıfır Kol & Atlet	sifir-kol-atlet	/uploads/categories/sifir-kol-atlet-1767895299136.jpg	103
f406a826-d6f2-4c06-a3bd-3cd66166f320	Şort	sort	/uploads/categories/sort-1767895299350.jpg	104
5e2a6a17-ab53-4358-b87c-c8c34ace2ed3	T-Shirt	tshirt	/uploads/categories/tshirt-1767895299582.jpg	105
99d2ddc8-a76f-4039-8a18-05ab59a2c7f4	ÖZEL SERİ	ozel-seri	/uploads/categories/ozel-seri-1767914273594.png	100
62333b27-6d73-4997-9923-f743763a4aa9	T-SHIRT	t-shirt	/uploads/categories/t-shirt-1767914274555.jpg	100
1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	Çakılar	cakilar	\N	1
ad013451-3c9e-41bc-8049-56f483a47d04	Kamp Çakıları	kamp-cakilari	\N	2
cb4edc84-9dcb-43cd-9b15-34c7a9da551e	Outdoor & Kamp Çakıları	outdoor-kamp-cakisi	\N	3
7f57b142-a343-4583-82ec-5b4f6c515976	Aşı Çakıları	asi-cakisi	\N	4
c62ba918-1050-4711-8938-4f29e1c03f53	İthal Çakılar	ithal-caki	\N	5
6ed78d4a-a2b9-4541-b680-a9f8b7cc3956	Bıçaklar	bicaklar	\N	6
559892ac-a474-4993-ad89-33107ed57f55	Kamp Bıçakları	kamp-bicaklari	\N	7
428791d6-767a-42df-9888-8793be5a4761	Mutfak Bıçakları	mutfak-bicaklari	\N	8
5df8b507-c240-48c0-b08a-91ceda8ac5a1	Şef Bıçakları	sef-bicaklari	\N	9
cab384ff-6ccf-4f6c-9c42-4c4a173bc692	Kasap Bıçakları	kasap-bicaklari	\N	10
3724d11a-9906-4ea7-b437-410128f9427b	Balık Bıçağı	balik-bicagi	\N	11
e5cb5045-6dbb-42b6-93ba-ec66257b24b6	Bıçaklık	bicaklik	\N	12
4ffd347d-e663-4081-8216-bb2b1f5c7eff	Bağ & Bahçe Aletleri	bag-bahce-aletleri	\N	13
b4869304-a94f-410a-9519-d0fdfa248f12	Budama & Kesme	budama-kesme	\N	14
2b2964c2-49b6-46ee-8813-b792d6b1eacb	Toprak İşleme Aletleri	toprak-isleme-aletleri	\N	15
c6a9816b-9e76-449e-b1ae-c01a4228aa15	Sulama Sistemleri	sulama-sistemleri	\N	16
094db602-8fbe-42a2-ad69-0e2edcfa641e	Koruyucu Ekipmanlar	koruyucu-ekipmanlar	\N	17
4e4db4de-d848-44bd-91af-8247f46299a4	Pet Shop & Çiftlik Ekipmanları	pet-shop-ciftlik-ekipmanlari	\N	18
18a94d39-4c0b-4a4a-b04c-a5d3def2b87a	Evcil Hayvan Ürünleri	evcil-hayvan-urunleri	\N	19
f175ad65-d33b-4c3c-ac39-dffc251bb333	Yular & Halatlar	yular-halatlar	\N	20
69c457d0-1ae5-4d47-aad2-7a6f282a4b78	Zincir & Bağlama	zincir-baglama	\N	21
574624ef-6bc4-406f-98f9-8fe48ad47428	Saraciye Ürünleri	saraciye-urunleri	\N	22
7f2ff375-800d-4d1e-9bda-46ad11c971b8	Nalbur & Hırdavat	nalbur-hirdavat	\N	23
c7cfef10-0e8e-4037-90bf-48e69ccb2841	Mangal & Izgara & Ahşap	mangal-izgara-ahsap	\N	24
6c9e38c2-a6b8-49e1-8154-3fea35571050	Mangal & Izgaralar	mangal-izgaralar	\N	25
b12f4502-f966-43ed-af85-13b16657c813	Izgara Ekipmanları	izgara-ekipmanlari	\N	26
7ddfc44e-78aa-4607-b506-3cf52d63d569	Ahşap Ürünler	ahsap-urunler	\N	27
\.


--
-- Data for Name: coupon_redemptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupon_redemptions (id, coupon_id, order_id, user_id, discount_amount, created_at) FROM stdin;
5ab2e9df-4514-4d6c-88c5-37b8566e5ad7	bd31294b-06c4-434a-b3d8-590d3b1599dd	6029846e-3a8c-483d-9573-d29345009f2f	60f9759c-3a71-412d-b772-500593f08536	0.00	2026-01-09 02:20:16.257125
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count, per_user_limit, is_active, starts_at, expires_at, created_at, updated_at, is_influencer_code, influencer_name, influencer_instagram, commission_type, commission_value, total_commission_earned, is_paid, paid_at, free_shipping, applies_to_shipping) FROM stdin;
bd31294b-06c4-434a-b3d8-590d3b1599dd	EMIR10	\N	fixed	0.00	\N	\N	\N	1	1	t	\N	\N	2026-01-09 02:09:08.022889	2026-01-09 02:09:08.022889	t	Emir	TOOV.TR	per_use	0.00	0.00	f	\N	f	f
\.


--
-- Data for Name: dealers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dealers (id, name, email, phone, contact_person, address, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_jobs (id, campaign_id, recipient_email, recipient_name, status, sent_at, opened_at, clicked_at, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.favorites (id, user_id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: influencer_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.influencer_payments (id, coupon_id, amount, note, paid_at) FROM stdin;
\.


--
-- Data for Name: low_stock_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.low_stock_alerts (id, variant_id, threshold, is_enabled, last_notified_at, created_at) FROM stdin;
\.


--
-- Data for Name: marketplace_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketplace_categories (id, marketplace_id, external_id, name, parent_external_id, site_category_id, created_at, updated_at, full_path) FROM stdin;
\.


--
-- Data for Name: marketplace_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketplace_products (id, marketplace_id, external_id, external_product_code, product_id, image_hashes, content_hash, last_synced_at, created_at) FROM stdin;
\.


--
-- Data for Name: marketplace_sync_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketplace_sync_runs (id, marketplace_id, mode, status, trigger, stats, errors, started_at, completed_at, error_summary) FROM stdin;
\.


--
-- Data for Name: marketplaces; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.marketplaces (id, type, name, is_active, encrypted_credentials, config, last_full_sync_at, last_delta_sync_at, created_at, updated_at, category_tree_fetched_at) FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.menu_items (id, title, type, category_id, url, parent_id, display_order, is_active, open_in_new_tab, created_at, updated_at) FROM stdin;
a8637756-7809-48a0-b049-b44877dd3565	Çakılar	submenu	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	\N	\N	10	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
3cf6ed89-bc48-46b8-b20b-5e29b22a467e	Bıçaklar	submenu	6ed78d4a-a2b9-4541-b680-a9f8b7cc3956	\N	\N	20	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
4304d814-909d-42d9-bee2-3990d4f14836	Bağ & Bahçe Aletleri	submenu	4ffd347d-e663-4081-8216-bb2b1f5c7eff	\N	\N	30	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
6782c446-febc-4245-be79-391cb97128f9	Pet Shop & Çiftlik	submenu	4e4db4de-d848-44bd-91af-8247f46299a4	\N	\N	40	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
328a25b3-97a6-4534-bca4-1e2a52821dc5	Nalbur & Hırdavat	category	7f2ff375-800d-4d1e-9bda-46ad11c971b8	\N	\N	50	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
8e8e66d7-1145-414a-af15-df4da97fd0d8	Mangal & Izgara & Ahşap	submenu	c7cfef10-0e8e-4037-90bf-48e69ccb2841	\N	\N	60	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
4d7459b4-0b09-4a01-bb99-02bd0e56bbd9	Tüm Ürünler	category	9ad27dda-5d85-4585-bf24-691167d18b81	\N	\N	70	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
dd18f954-2f2b-498a-a9cd-217b13718e29	Kamp Çakıları	category	ad013451-3c9e-41bc-8049-56f483a47d04	\N	a8637756-7809-48a0-b049-b44877dd3565	11	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
27b69cb5-12d0-4a4d-be8a-9301576432f7	Outdoor & Kamp Çakıları	category	cb4edc84-9dcb-43cd-9b15-34c7a9da551e	\N	a8637756-7809-48a0-b049-b44877dd3565	12	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
a431cf1b-70e2-491c-bbed-7f86cc279998	Aşı Çakıları	category	7f57b142-a343-4583-82ec-5b4f6c515976	\N	a8637756-7809-48a0-b049-b44877dd3565	13	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
b5fca73f-bea6-4924-8687-113f2c97ac1f	İthal Çakılar	category	c62ba918-1050-4711-8938-4f29e1c03f53	\N	a8637756-7809-48a0-b049-b44877dd3565	14	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
484269bb-5951-4cc2-8a66-592a07a48fff	Kamp Bıçakları	category	559892ac-a474-4993-ad89-33107ed57f55	\N	3cf6ed89-bc48-46b8-b20b-5e29b22a467e	21	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
799fd111-b397-4924-a84c-0217514b8aa3	Mutfak Bıçakları	category	428791d6-767a-42df-9888-8793be5a4761	\N	3cf6ed89-bc48-46b8-b20b-5e29b22a467e	22	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
cdee0a56-768d-4b99-a091-5fb9346f4339	Şef Bıçakları	category	5df8b507-c240-48c0-b08a-91ceda8ac5a1	\N	3cf6ed89-bc48-46b8-b20b-5e29b22a467e	23	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
66b4639a-2a76-4e81-afb5-ecd53f46d124	Kasap Bıçakları	category	cab384ff-6ccf-4f6c-9c42-4c4a173bc692	\N	3cf6ed89-bc48-46b8-b20b-5e29b22a467e	24	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
dcd12273-0419-4124-8138-620b21fc29aa	Balık Bıçağı	category	3724d11a-9906-4ea7-b437-410128f9427b	\N	3cf6ed89-bc48-46b8-b20b-5e29b22a467e	25	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
7e4ef4b4-a830-477b-925a-e3b84bf39408	Bıçaklık	category	e5cb5045-6dbb-42b6-93ba-ec66257b24b6	\N	3cf6ed89-bc48-46b8-b20b-5e29b22a467e	26	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
9683ee9d-b57b-4f90-b479-49dfbc68359f	Budama & Kesme	category	b4869304-a94f-410a-9519-d0fdfa248f12	\N	4304d814-909d-42d9-bee2-3990d4f14836	31	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
a6a2b2f7-f168-46cc-8d13-97963df67289	Toprak İşleme Aletleri	category	2b2964c2-49b6-46ee-8813-b792d6b1eacb	\N	4304d814-909d-42d9-bee2-3990d4f14836	32	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
a8dad264-a6ff-473e-b5f4-5dfd9bbd1eb1	Sulama Sistemleri	category	c6a9816b-9e76-449e-b1ae-c01a4228aa15	\N	4304d814-909d-42d9-bee2-3990d4f14836	33	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
d6683777-c63a-496c-8801-99dab97783fa	Koruyucu Ekipmanlar	category	094db602-8fbe-42a2-ad69-0e2edcfa641e	\N	4304d814-909d-42d9-bee2-3990d4f14836	34	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
537e116e-068e-4f18-abab-625c90377e86	Evcil Hayvan Ürünleri	category	18a94d39-4c0b-4a4a-b04c-a5d3def2b87a	\N	6782c446-febc-4245-be79-391cb97128f9	41	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
62deb0fb-072a-4322-93cf-8a80d309ba81	Yular & Halatlar	category	f175ad65-d33b-4c3c-ac39-dffc251bb333	\N	6782c446-febc-4245-be79-391cb97128f9	42	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
8f7235a0-717e-4778-a27a-fe85e4c30309	Zincir & Bağlama	category	69c457d0-1ae5-4d47-aad2-7a6f282a4b78	\N	6782c446-febc-4245-be79-391cb97128f9	43	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
e0f5e74c-b84a-4cc0-bde6-4b4733dc4095	Saraciye Ürünleri	category	574624ef-6bc4-406f-98f9-8fe48ad47428	\N	6782c446-febc-4245-be79-391cb97128f9	44	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
38c33c10-320c-44b3-8b7a-ca8be503a472	Mangal & Izgaralar	category	6c9e38c2-a6b8-49e1-8154-3fea35571050	\N	8e8e66d7-1145-414a-af15-df4da97fd0d8	61	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
6c05e4b1-5560-4c4e-b2e0-44a16e376167	Izgara Ekipmanları	category	b12f4502-f966-43ed-af85-13b16657c813	\N	8e8e66d7-1145-414a-af15-df4da97fd0d8	62	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
2a8b6bdc-c4ba-4106-9e4f-65b06c13f872	Ahşap Ürünler	category	7ddfc44e-78aa-4607-b506-3cf52d63d569	\N	8e8e66d7-1145-414a-af15-df4da97fd0d8	63	t	f	2026-07-06 08:12:50.693	2026-07-06 08:12:50.693
b7638e78-7366-4750-8023-0bc1fff86815	Mangal Aksesuarları	category	0a185759-ad4a-4c69-9407-4ba8a07d6e66	\N	8e8e66d7-1145-414a-af15-df4da97fd0d8	64	t	f	2026-07-06 08:21:03.639251	2026-07-06 08:21:03.639251
2ce693c5-dd2c-47b4-8e4d-361ad34e9f0f	Kömür & Tutuşturucu	category	e01b0a1e-c7ab-4fb7-8dc9-918b51f93ee9	\N	8e8e66d7-1145-414a-af15-df4da97fd0d8	65	t	f	2026-07-06 08:21:03.639251	2026-07-06 08:21:03.639251
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, variant_id, product_name, variant_details, price, quantity, subtotal) FROM stdin;
f77fc49a-c2da-40a5-904f-020ce2a454ab	aba06f99-33e2-4bf9-9510-f1aead0cc7b8	\N	\N	SLIMFIT FIRST DREAM SERIES T-SHIRT SİYAH	\N	679.99	1	679.99
66cf6eb2-8aa9-494f-9380-333aa7f4b456	6029846e-3a8c-483d-9573-d29345009f2f	\N	\N	SLIMFIT FIRST DREAM SERIES T-SHIRT SİYAH	\N	679.99	1	679.99
a6c5630d-8e93-4e3e-ad17-a47423d9606c	aba06f99-33e2-4bf9-9510-f1aead0cc7b8	\N	\N	OVERSIZE FIRST DREAM SERIES T-SHIRT BEYAZ	\N	679.99	1	679.99
8683ec97-7e28-4699-9c44-a8e2767f13e3	eecbad3d-dcdc-4039-9046-374df9fcf9b7	\N	\N	OVERSIZE FIRST DREAM SERIES T-SHIRT BEYAZ	\N	679.99	1	679.99
\.


--
-- Data for Name: order_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_notes (id, order_id, author_id, author_type, note_type, content, is_private, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, customer_name, customer_email, customer_phone, shipping_address, subtotal, shipping_cost, total, status, payment_method, payment_status, notes, created_at, updated_at, discount_amount, coupon_code, tracking_number, tracking_url, shipping_carrier, invoice_url) FROM stdin;
aba06f99-33e2-4bf9-9510-f1aead0cc7b8	HNK1767915109833	Emir Şimşek	emirsimseekk@gmail.com	05308616785	{"city": "Beykoz", "address": "Molla Mehmet Sokak No:7", "district": "Beykoz", "postalCode": "34825"}	0.00	49.90	49.90	pending	Kapıda Ödeme	pending	\N	2026-01-08 23:31:49.836029	2026-01-08 23:31:49.836029	0.00	\N	\N	\N	\N	\N
eecbad3d-dcdc-4039-9046-374df9fcf9b7	HNK1767919140202	Emir Şimşek	emirsimseekk@gmail.com	05308616785	{"city": "Beykoz", "address": "Molla Mehmet Sokak No:7", "district": "Beykoz", "postalCode": "34825"}	679.99	49.90	729.89	pending	Kapıda Ödeme	pending	\N	2026-01-09 00:39:00.204644	2026-01-09 00:39:00.204644	0.00	\N	\N	\N	\N	\N
6029846e-3a8c-483d-9573-d29345009f2f	HNK1767925216245	Emir Şimşek	emirsimseekk@gmail.com	05308616785	{"city": "Beykoz", "address": "Molla Mehmet Sokak No:7", "district": "Beykoz", "postalCode": "34825"}	679.99	49.90	729.89	pending	Kapıda Ödeme	pending	\N	2026-01-09 02:20:16.25275	2026-01-09 02:20:16.25275	0.00	EMIR10	\N	\N	\N	\N
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pages (id, slug, title, content, is_published, created_at, updated_at) FROM stdin;
9edfbada-0c7a-4c75-820f-1aba5e03253c	hakkimizda	Hakkımızda	<h2>Sepetzen Kimdir?</h2>\n<p>Sepetzen, 2020 yılında Dalaman, Muğla'da kurulmuş bir kamp, outdoor ve bıçak markasıdır. Doğanın içinde zaman geçiren insanların ihtiyaçlarını karşılamak amacıyla yola çıktık.</p>\n<p>Ahmet Uğur Durmaz liderliğinde küçük bir ekip tarafından yönetilen Sepetzen; av bıçakları, kamp çakıları, outdoor ekipmanları ve bağ & bahçe ürünleri alanlarında faaliyet göstermektedir.</p>\n<h2>Vizyonumuz</h2>\n<p>Türkiye'nin doğal zenginliklerine duyulan saygıyı, kaliteli ürünlerle buluşturmak. Her bıçak, her ekipman; bir hikâyenin parçasıdır.</p>\n<h2>Neden Sepetzen?</h2>\n<ul>\n<li>El seçimi, kalite kontrollü ürünler</li>\n<li>Hızlı ve güvenli kargo (1500 TL üzeri ÜCRETSİZ)</li>\n<li>Uzman kadro ile kişisel müşteri hizmetleri</li>\n<li>Dalaman merkezli, Türkiye geneli hizmet</li>\n</ul>\n<h2>İletişim</h2>\n<p><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>\n<p><strong>Telefon:</strong> 0536 630 11 38</p>\n<p><strong>E-posta:</strong> sepetzen@gmail.com</p>	t	2026-07-06 07:44:15.420934	2026-07-06 07:44:15.420934
3bada938-2041-4ea4-be24-71369dda1cb5	iletisim	İletişim	<h2>Bize Ulaşın</h2>\n<p>Sorularınız ve sipariş öncesi bilgi için bizimle iletişime geçebilirsiniz.</p>\n<h2>İletişim Bilgileri</h2>\n<ul>\n<li><strong>Yetkili:</strong> Ahmet Uğur Durmaz</li>\n<li><strong>Telefon / WhatsApp:</strong> 0536 630 11 38</li>\n<li><strong>E-posta:</strong> sepetzen@gmail.com</li>\n<li><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</li>\n</ul>\n<h2>Çalışma Saatleri</h2>\n<p>Pazartesi – Cumartesi: 09:00 – 18:00</p>\n<p>Pazar: Kapalı</p>	t	2026-07-06 07:44:15.424365	2026-07-06 07:44:15.424365
19c9736a-fd38-4668-9940-ff53d48d5044	mesafeli-satis-sozlesmesi	Mesafeli Satış Sözleşmesi	<h2>MESAFELİ SATIŞ SÖZLEŞMESİ</h2>\n  <p>Bu Mesafeli Satış Sözleşmesi ("Sözleşme"), aşağıda bilgileri verilen Satıcı ile Alıcı arasında, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri çerçevesinde akdedilmiştir.</p>\n\n  <h3>Madde 1 – Taraflar</h3>\n  <p><strong>SATICI:</strong></p>\n  <ul>\n  <li><strong>Ünvan:</strong> Ahmet Uğur Durmaz (Sepetzen)</li>\n  <li><strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</li>\n  <li><strong>Telefon:</strong> 0536 630 11 38</li>\n  <li><strong>E-posta:</strong> sepetzen@gmail.com</li>\n  <li><strong>Web sitesi:</strong> sepetzen.com</li>\n  </ul>\n  <p><strong>ALICI:</strong> Sipariş formunda beyan edilen ad, adres ve iletişim bilgilerine sahip kişi.</p>\n\n  <h3>Madde 2 – Sözleşmenin Konusu</h3>\n  <p>İşbu Sözleşme, Alıcı'nın Satıcı'ya ait sepetzen.com internet sitesinden elektronik ortamda siparişini yaptığı aşağıda nitelikleri ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini kapsamaktadır.</p>\n\n  <h3>Madde 3 – Sözleşme Konusu Ürün/Ürünler</h3>\n  <p>Malın/Ürünün temel özellikleri (türü, miktarı, marka/modeli, rengi, adedi) ve satış fiyatı dahil tüm vergiler dahil toplam satış bedeli sipariş özetinde ve ödeme sayfasında gösterilmektedir.</p>\n\n  <h3>Madde 4 – Genel Hükümler</h3>\n  <p>4.1. Alıcı, sepetzen.com internet sitesinde sözleşme konusu ürünün temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi verdiğini beyan eder.</p>\n  <p>4.2. Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşulu ile her bir ürün için Alıcı'nın yerleşim yeri uzaklığına bağlı olarak ön bilgiler içinde açıklanan süre içinde Alıcı veya Alıcı'nın gösterdiği adresteki kişi/kuruluşa teslim edilir.</p>\n  <p>4.3. Sözleşme konusu ürün, Alıcı'dan başka bir kişi/kuruluşa teslim edilecek ise, teslim edilecek kişi/kuruluşun teslimatı kabul etmemesinden Satıcı sorumlu tutulamaz.</p>\n  <p>4.4. Satıcı, sözleşme konusu ürünün sağlam, eksiksiz, siparişte belirtilen niteliklere uygun ve varsa garanti belgeleri ve kullanım kılavuzları ile teslim edilmesinden sorumludur.</p>\n  <p>4.5. Sözleşme konusu ürünün teslimatı için işbu Sözleşme'nin imzalı nüshasının Satıcı'ya ulaştırılması şarttır. Herhangi bir nedenle ürün bedeli ödenmez veya banka kayıtlarında iptal edilir ise, Satıcı ürünün teslimi yükümlülüğünden kurtulmuş kabul edilir.</p>\n\n  <h3>Madde 5 – Cayma Hakkı</h3>\n  <p>5.1. Alıcı, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişi/kuruluşa teslim tarihinden itibaren 14 (on dört) gün içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.</p>\n  <p>5.2. Cayma hakkının kullanılması için bu süre içinde Satıcı'ya e-posta veya telefon ile bildirimde bulunulması ve ürünün aşağıdaki Madde 6 hükümleri çerçevesinde iade edilmesi şarttır.</p>\n  <p>5.3. Aşağıdaki hallerde cayma hakkı kullanılamaz:</p>\n  <ul>\n  <li>Fiyatı finansal piyasalardaki dalgalanmalara bağlı olarak değişen ve Satıcı'nın kontrolünde olmayan mal veya hizmetlere ilişkin sözleşmeler,</li>\n  <li>Alıcı'nın istekleri veya açıkça onun kişisel ihtiyaçları doğrultusunda hazırlanan mallara ilişkin sözleşmeler,</li>\n  <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek mallara ilişkin sözleşmeler,</li>\n  <li>Tesliminden sonra ambalaj, bant, mühür, paket gibi koruyucu unsurları açılmış; iadesi sağlık ve hijyen açısından uygun olmayan mallara ilişkin sözleşmeler.</li>\n  </ul>\n\n  <h3>Madde 6 – İade Prosedürü</h3>\n  <p>6.1. Cayma hakkının kullanıldığına dair bildirimin Satıcı'ya ulaşmasından itibaren Satıcı, tahsil etmiş olduğu tüm ödemeleri 14 (on dört) gün içinde iade etmekle yükümlüdür.</p>\n  <p>6.2. Alıcı, cayma hakkını kullanmasından itibaren 10 (on) gün içinde ürünü iade etmekle yükümlüdür.</p>\n  <p>6.3. İade kargosunun ücreti Alıcı'ya aittir; ürün orijinal ambalajında, kullanılmamış ve hasarsız olarak iade edilmelidir.</p>\n\n  <h3>Madde 7 – Teslimata İlişkin Hükümler</h3>\n  <p>7.1. Ürünler sipariş onayından itibaren 3-7 iş günü içinde kargo ile gönderilir.</p>\n  <p>7.2. 1500 TL ve üzeri siparişlerde kargo ücretsizdir. Bu tutarın altındaki siparişlerde kargo ücreti sipariş esnasında belirtilir.</p>\n  <p>7.3. Kargo firmasının kusuru nedeniyle doğan gecikmelerden Satıcı sorumlu değildir.</p>\n\n  <h3>Madde 8 – Uyuşmazlık Çözümü</h3>\n  <p>İşbu Sözleşme'den doğan uyuşmazlıklarda, Gümrük ve Ticaret Bakanlığı'nca ilan edilen değere kadar Tüketici Hakem Heyetleri, bu değerin üzerindeki uyuşmazlıklarda Tüketici Mahkemeleri yetkilidir. Yetkili Hakem Heyeti ve Tüketici Mahkemesi, Dalaman ilçesinde bulunan heyetler ve mahkemelerdir.</p>\n\n  <h3>Madde 9 – Yürürlük</h3>\n  <p>Alıcı, sipariş onay sürecinde elektronik ortamda ön bilgileri onaylamasıyla işbu Sözleşme'nin tüm koşullarını kabul etmiş sayılır. Bu Sözleşme, sipariş onayı anında yürürlüğe girer ve her iki taraf için bağlayıcıdır.</p>	t	2026-07-06 07:44:15.427445	2026-07-06 07:44:15.427445
d5396afb-a68c-4758-9263-eaf8df1fa345	uyelik-sozlesmesi	Üyelik Sözleşmesi	<h2>ÜYELİK SÖZLEŞMESİ</h2>\n  <p>Bu Üyelik Sözleşmesi ("Sözleşme"), sepetzen.com internet sitesini ("Site") işleten Ahmet Uğur Durmaz (bundan böyle "Sepetzen" olarak anılacaktır) ile bu Sözleşme'yi kabul ederek Siteye üye olan kişi ("Üye") arasında akdedilmiştir.</p>\n\n  <h3>Madde 1 – Taraflar ve Konu</h3>\n  <p><strong>Sepetzen:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla — sepetzen@gmail.com — 0536 630 11 38</p>\n  <p>İşbu Sözleşme; Üye'nin Site'ye üye olma ve Site üzerinden gerçekleştireceği alışveriş işlemlerine ilişkin tarafların hak ve yükümlülüklerini düzenlemektedir.</p>\n\n  <h3>Madde 2 – Üyelik Koşulları ve Prosedürü</h3>\n  <p>2.1. Site'ye üye olabilmek için 18 (on sekiz) yaşını doldurmuş olmak ve fiil ehliyetine sahip bulunmak zorunludur.</p>\n  <p>2.2. Üyelik, üyelik formunun doldurulup onaylanması ve işbu Sözleşme ile Sepetzen Gizlilik Politikası'nın kabul edilmesi ile tamamlanır.</p>\n  <p>2.3. Üye, üyelik formunda gerçeğe aykırı, yanıltıcı veya eksik bilgi vermeyeceğini taahhüt eder. Aksi hâlde doğacak her türlü zarardan bizzat sorumludur.</p>\n  <p>2.4. Her gerçek kişi yalnızca bir üyelik oluşturabilir; birden fazla üyelik oluşturulduğunun tespiti hâlinde Sepetzen, fazla üyelikleri kapatma hakkını saklı tutar.</p>\n\n  <h3>Madde 3 – Üyenin Hak ve Yükümlülükleri</h3>\n  <p>3.1. Üye; kullanıcı adı ve şifresinin gizliliğini korumakla yükümlüdür. Bu bilgilerin üçüncü kişilerle paylaşılması, kaybolması veya çalınması durumunda doğabilecek zararlardan Sepetzen sorumlu değildir.</p>\n  <p>3.2. Üye, Site'yi yalnızca hukuka ve ahlaka uygun amaçlarla kullanacağını; Site'nin işleyişini engelleyecek ya da bozacak eylemlerden kaçınacağını kabul ve taahhüt eder.</p>\n  <p>3.3. Üye, Site üzerinden gerçekleştirdiği işlemlerden kaynaklanan her türlü yasal sorumluluktan şahsen sorumludur.</p>\n  <p>3.4. Üye, Site'deki içerik ve bilgilerin ticari amaçlarla kullanılamayacağını, kopyalanamayacağını, dağıtılamayacağını, başka bir platforma aktarılamayacağını kabul eder.</p>\n\n  <h3>Madde 4 – Sepetzen'in Hak ve Yükümlülükleri</h3>\n  <p>4.1. Sepetzen; Site'yi, ürünleri ve ödeme altyapısını yasal düzenlemelere uygun biçimde işletmekle yükümlüdür.</p>\n  <p>4.2. Sepetzen, önceden haber vermeksizin Site içeriğinde, ürün yelpazesinde veya fiyatlarında değişiklik yapma hakkını saklı tutar.</p>\n  <p>4.3. Sepetzen, teknik gereklilikler, bakım veya güncelleme sebebiyle Site'ye erişimi geçici olarak kısıtlayabilir.</p>\n\n  <h3>Madde 5 – Kişisel Verilerin Korunması</h3>\n  <p>5.1. Üye'ye ait kişisel veriler, Sepetzen Gizlilik Politikası ve 6698 sayılı KVKK çerçevesinde işlenir ve korunur.</p>\n  <p>5.2. Üye, kişisel verilerinin işlenmesine ilişkin haklarını sepetzen@gmail.com adresine yazılı başvuru yoluyla kullanabilir.</p>\n\n  <h3>Madde 6 – Üyeliğin Sona Ermesi</h3>\n  <p>6.1. Üye, dilediği zaman sepetzen@gmail.com adresine yazılı bildirimde bulunarak üyeliğini sonlandırabilir. Üyeliğin sonlandırılması, daha önce verilmiş siparişlere ilişkin hak ve yükümlülükleri ortadan kaldırmaz.</p>\n  <p>6.2. Sepetzen, Üye'nin işbu Sözleşme'ye, Site kullanım koşullarına veya yasal düzenlemelere aykırı davranması hâlinde, önceden bildirimde bulunmaksızın üyeliği geçici olarak askıya alma veya kalıcı olarak sonlandırma hakkına sahiptir.</p>\n\n  <h3>Madde 7 – Fikri Mülkiyet</h3>\n  <p>7.1. Site üzerindeki tüm içerikler (metin, görsel, logo, tasarım vb.) Sepetzen'e aittir ve telif hakkı yasaları kapsamında korunmaktadır. İzinsiz kullanım yasal yaptırıma tabidir.</p>\n\n  <h3>Madde 8 – Sorumluluğun Sınırlandırılması</h3>\n  <p>8.1. Sepetzen, üçüncü taraf bağlantılarından veya Üye'nin kendi kusuru nedeniyle uğradığı zararlardan sorumlu değildir. Ayrıca ürün tanımlarında yanlış ya da eksik bilgi yer alması durumunda, tespit üzerine düzeltme yapma hakkı saklıdır.</p>\n\n  <h3>Madde 9 – Sözleşme Değişiklikleri</h3>\n  <p>9.1. Sepetzen, işbu Sözleşme'yi önceden haber vermeksizin değiştirme hakkını saklı tutar. Değişiklikler, Site'de yayınlandığı tarihten itibaren geçerli olur. Üye'nin Site'yi kullanmaya devam etmesi, değişiklikleri kabul ettiği anlamına gelir.</p>\n\n  <h3>Madde 10 – Uygulanacak Hukuk ve Yetki</h3>\n  <p>10.1. İşbu Sözleşme Türk hukukuna tabidir. Uyuşmazlıklarda Muğla (Dalaman) Mahkemeleri ve İcra Daireleri yetkilidir.</p>\n\n  <h3>Madde 11 – Yürürlük</h3>\n  <p>Üye'nin üyelik formunu onaylaması, işbu Sözleşme'nin tamamını okuduğunu, anladığını ve kabul ettiğini gösterir. Sözleşme bu onay anında yürürlüğe girer.</p>	t	2026-07-06 07:44:15.437413	2026-07-06 07:44:15.437413
628c43fe-81d6-4394-852f-4cbddfa48fd9	gizlilik-guvenlik	Gizlilik Politikası	<h2>GİZLİLİK & GÜVENLİK POLİTİKASI</h2>\n  <p>Sepetzen olarak müşterilerimizin gizliliğine saygı duyuyor ve kişisel verilerini korumayı öncelikli bir sorumluluk olarak kabul ediyoruz. Bu politika; sepetzen.com web sitesini ziyaret ettiğinizde ve alışveriş yaptığınızda hangi verilerin toplandığını, nasıl kullanıldığını ve nasıl korunduğunu açıklamaktadır.</p>\n\n  <h3>1. Toplanan Bilgiler</h3>\n  <p><strong>a) Doğrudan Sizden Aldığımız Bilgiler:</strong></p>\n  <ul>\n  <li>Ad, soyad</li>\n  <li>E-posta adresi ve telefon numarası</li>\n  <li>Fatura ve teslimat adresi</li>\n  <li>Sipariş ve ödeme bilgileri (kart bilgileri tarafımızca saklanmaz)</li>\n  </ul>\n  <p><strong>b) Otomatik Olarak Toplanan Bilgiler:</strong></p>\n  <ul>\n  <li>IP adresi ve tarayıcı türü</li>\n  <li>Ziyaret ettiğiniz sayfalar ve geçirilen süre</li>\n  <li>Oturum çerezleri ve tercih verileri</li>\n  </ul>\n\n  <h3>2. Verilerin Kullanım Amaçları</h3>\n  <ul>\n  <li>Sipariş işlemlerinin tamamlanması ve kargo takibi</li>\n  <li>Hesabınıza ait bildirim ve güncellemelerin iletilmesi</li>\n  <li>Müşteri destek hizmetlerinin sağlanması</li>\n  <li>Rıza vermeniz hâlinde e-posta, SMS veya WhatsApp pazarlama iletişimi</li>\n  <li>Yasal yükümlülüklerin yerine getirilmesi (vergi, fatura)</li>\n  <li>Site güvenliğinin ve performansının korunması</li>\n  </ul>\n\n  <h3>3. Verilerin Paylaşımı</h3>\n  <p>Kişisel verileriniz üçüncü taraflara satılmaz veya kiralanmaz. Verileriniz yalnızca aşağıdaki durumlarla sınırlı olarak paylaşılabilir:</p>\n  <ul>\n  <li><strong>Kargo firmaları:</strong> Teslimat amacıyla (isim, adres, telefon)</li>\n  <li><strong>Ödeme altyapısı (iyzico):</strong> Ödeme işleminin gerçekleştirilmesi için</li>\n  <li><strong>Yetkili kamu kurumları:</strong> Yasal zorunluluk hâlinde</li>\n  </ul>\n\n  <h3>4. Verilerin Güvenliği</h3>\n  <p>Verilerinizin güvenliği için alınan teknik ve idari tedbirler şunlardır:</p>\n  <ul>\n  <li><strong>SSL/TLS Şifreleme:</strong> Tüm veri iletimi 256-bit SSL şifrelemesi ile korunmaktadır.</li>\n  <li><strong>3D Secure Ödeme:</strong> Kart ödemeleri iyzico altyapısıyla 3D Secure protokolü üzerinden işlenmektedir. Kart bilgileriniz Sepetzen sistemlerinde saklanmamaktadır.</li>\n  <li><strong>Erişim Kontrolü:</strong> Kişisel verilere erişim yalnızca yetkili personel ile sınırlıdır.</li>\n  <li><strong>Güvenli Altyapı:</strong> Veriler, endüstri standardı güvenlik önlemleriyle korunan sunucularda saklanmaktadır.</li>\n  </ul>\n\n  <h3>5. Üçüncü Taraf Bağlantılar</h3>\n  <p>Sitemiz, üçüncü taraf web sitelerine bağlantılar içerebilir. Bu sitelerin gizlilik uygulamalarından Sepetzen sorumlu değildir ve bu siteleri ziyaret etmeden önce ilgili gizlilik politikalarını incelemenizi öneririz.</p>\n\n  <h3>6. Haklarınız</h3>\n  <p>KVKK'nın 11. maddesi kapsamındaki haklarınızı kullanmak için lütfen <a href="/sayfa/kvkk-aydinlatma-metni">KVKK Aydınlatma Metni</a> sayfasını inceleyiniz. Taleplerinizi sepetzen@gmail.com adresine iletebilirsiniz.</p>\n\n  <h3>7. Politika Değişiklikleri</h3>\n  <p>Bu politika zaman zaman güncellenebilir. Güncel versiyona her zaman bu sayfadan ulaşabilirsiniz. Önemli değişiklikler size e-posta yoluyla bildirilir.</p>\n\n  <h3>İletişim</h3>\n  <p>Gizlilik ve güvenlikle ilgili sorularınız için:<br>\n  <strong>E-posta:</strong> sepetzen@gmail.com<br>\n  <strong>Telefon:</strong> 0536 630 11 38<br>\n  <strong>Adres:</strong> Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>	t	2026-07-06 07:44:15.443603	2026-07-06 07:44:15.443603
bc4356cf-e437-448c-ae82-ac0f29a7b269	cerez-politikasi	Çerez Politikası	<h2>ÇEREZ POLİTİKASI</h2>\n  <p>Bu Çerez Politikası, sepetzen.com web sitesinin çerez kullanımını ve kullanıcıların bu çerezler üzerindeki tercihlerini açıklamaktadır. 6698 sayılı KVKK ve ilgili mevzuat kapsamında hazırlanmıştır.</p>\n\n  <h3>1. Çerez Nedir?</h3>\n  <p>Çerezler (cookies), bir web sitesini ziyaret ettiğinizde tarayıcınız tarafından cihazınıza kaydedilen küçük metin dosyalarıdır. Çerezler, web sitesinin düzgün çalışması, kullanıcı deneyiminin iyileştirilmesi ve site trafiğinin analiz edilmesi amacıyla kullanılır.</p>\n\n  <h3>2. Kullandığımız Çerez Türleri</h3>\n\n  <h4>a) Zorunlu Çerezler</h4>\n  <p>Bu çerezler, web sitesinin temel işlevlerinin çalışması için gereklidir ve devre dışı bırakılamaz.</p>\n  <ul>\n  <li><strong>Oturum çerezi (session cookie):</strong> Giriş durumunuzu ve sepet içeriğinizi oturum boyunca hatırlar. Tarayıcı kapanınca silinir.</li>\n  <li><strong>CSRF koruma çerezi:</strong> Form gönderimlerini güvenli hale getirir.</li>\n  <li><strong>Tercih çerezi:</strong> Dil ve görüntü tercihlerinizi hatırlar.</li>\n  </ul>\n\n  <h4>b) İşlevsel Çerezler</h4>\n  <p>Site deneyiminizi kişiselleştirmek için kullanılır.</p>\n  <ul>\n  <li><strong>Kimlik doğrulama çerezi:</strong> "Beni hatırla" özelliğini sağlar; oturum açık kalmasına imkân tanır (30 güne kadar).</li>\n  <li><strong>Favoriler çerezi:</strong> Favori ürün listenizi hatırlar.</li>\n  </ul>\n\n  <h4>c) Analitik Çerezler</h4>\n  <p>Siteyi nasıl kullandığınızı anlamak, hataları tespit etmek ve site performansını iyileştirmek amacıyla kullanılır. Bu çerezler kişisel kimlik bilgisi içermez.</p>\n  <ul>\n  <li><strong>Google Analytics (_ga, _gid, _gat):</strong> Sayfa görüntülemeleri, oturum süresi ve kullanıcı sayısı gibi istatistikleri toplar. Veriler anonim olarak işlenir.</li>\n  </ul>\n\n  <h4>d) Pazarlama ve Hedefleme Çerezleri</h4>\n  <p>Yalnızca açık rızanızla etkinleştirilir.</p>\n  <ul>\n  <li><strong>Meta (Facebook) Pixel:</strong> Reklamlarımızın etkinliğini ölçmek ve size ilgili reklamlar göstermek amacıyla kullanılır.</li>\n  </ul>\n\n  <h3>3. Çerez Saklama Süreleri</h3>\n  <table>\n  <thead><tr><th>Çerez Adı</th><th>Tür</th><th>Süre</th></tr></thead>\n  <tbody>\n  <tr><td>session_id</td><td>Zorunlu</td><td>Oturum sonu</td></tr>\n  <tr><td>auth_token</td><td>İşlevsel</td><td>30 gün</td></tr>\n  <tr><td>_ga</td><td>Analitik</td><td>2 yıl</td></tr>\n  <tr><td>_gid</td><td>Analitik</td><td>24 saat</td></tr>\n  <tr><td>fbp (Meta Pixel)</td><td>Pazarlama</td><td>90 gün</td></tr>\n  </tbody>\n  </table>\n\n  <h3>4. Çerezleri Nasıl Yönetirsiniz?</h3>\n  <p>Tarayıcı ayarlarınızdan çerezleri yönetebilir, silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezlerin devre dışı bırakılması halinde Site'nin bazı işlevleri düzgün çalışmayabilir.</p>\n  <p>Yaygın tarayıcılarda çerez ayarları:</p>\n  <ul>\n  <li><strong>Google Chrome:</strong> Ayarlar → Gizlilik ve güvenlik → Çerezler</li>\n  <li><strong>Mozilla Firefox:</strong> Ayarlar → Gizlilik & Güvenlik → Çerezler</li>\n  <li><strong>Safari:</strong> Tercihler → Gizlilik → Çerezleri yönet</li>\n  <li><strong>Microsoft Edge:</strong> Ayarlar → Çerezler ve site izinleri</li>\n  </ul>\n  <p>Google Analytics çerezlerini devre dışı bırakmak için: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics Opt-out Eklentisi</a></p>\n\n  <h3>5. Üçüncü Taraf Çerezler</h3>\n  <p>Sitemiz; Google, Meta (Facebook) gibi üçüncü taraf hizmet sağlayıcıların çerezlerini kullanabilir. Bu çerezlere ilişkin gizlilik politikaları için ilgili sağlayıcıların web sitelerini inceleyiniz.</p>\n\n  <h3>6. Değişiklikler</h3>\n  <p>Bu Çerez Politikası, yasal düzenlemelere veya hizmetlerimizdeki değişikliklere bağlı olarak güncellenebilir. Güncel politikaya bu sayfadan ulaşabilirsiniz.</p>\n\n  <h3>İletişim</h3>\n  <p>Çerez kullanımı hakkındaki sorularınız için sepetzen@gmail.com adresine yazabilirsiniz.</p>	t	2026-07-06 07:44:15.447267	2026-07-06 07:44:15.447267
fb47565b-836c-4cc8-96c9-45eafe83759c	on-bilgilendirme-formu	Ön Bilgilendirme Formu	<h2>ÖN BİLGİLENDİRME FORMU</h2>\n<h3>Satıcı Bilgileri</h3>\n<p>Ahmet Uğur Durmaz – Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla<br>\nTelefon: 0536 630 11 38 | E-posta: sepetzen@gmail.com</p>\n<h3>Ürün Bilgileri</h3>\n<p>Sipariş edilen ürünlerin adı, miktarı, fiyatı ve özellikleri sipariş özetinde yer almaktadır.</p>\n<h3>Ödeme ve Teslimat</h3>\n<p>Teslimat süresi sipariş onayından itibaren 3-7 iş günüdür. 1500 TL üzeri siparişlerde kargo ücretsizdir.</p>\n<h3>Cayma Hakkı</h3>\n<p>Teslim tarihinden itibaren 14 gün içinde iade hakkı bulunmaktadır.</p>	t	2026-07-06 07:44:15.434067	2026-07-06 07:44:15.434067
f236b464-0132-4a73-8eb4-a103d4218895	kargo-sureci	Kargo Bilgileri	<h2>KARGO VE TESLİMAT</h2>\n<h3>Teslimat Süresi</h3>\n<p>Siparişleriniz, onaydan itibaren 1-3 iş günü içinde hazırlanır ve 1-4 iş günü içinde teslim edilir (toplam 3-7 iş günü).</p>\n<h3>Kargo Ücreti</h3>\n<ul>\n<li>1500 TL ve üzeri siparişlerde kargo <strong>ÜCRETSİZ</strong>dir.</li>\n<li>1500 TL altı siparişlerde kargo ücreti sepette gösterilir.</li>\n</ul>\n<h3>Kargo Firması</h3>\n<p>Siparişleriniz Yurtiçi Kargo veya MNG Kargo ile gönderilmektedir. Kargo takip numarası siparişiniz yola çıktığında e-posta ile iletilecektir.</p>\n<h3>Adres Hataları</h3>\n<p>Yanlış adres bilgisi nedeniyle oluşan kargo giderleri alıcıya aittir.</p>	t	2026-07-06 07:44:15.45017	2026-07-06 07:44:15.45017
88f1b434-5745-4c5a-be13-929319932aa8	iade-sureci	İade Formu	<h2>İADE FORMU</h2>\n<p>İade talebiniz için aşağıdaki bilgileri doldurup <strong>sepetzen@gmail.com</strong> adresine gönderin:</p>\n<table>\n<tr><th>Alan</th><th>Bilgi</th></tr>\n<tr><td>Ad Soyad</td><td></td></tr>\n<tr><td>Sipariş Numarası</td><td></td></tr>\n<tr><td>Ürün Adı</td><td></td></tr>\n<tr><td>İade Nedeni</td><td></td></tr>\n<tr><td>Telefon</td><td></td></tr>\n</table>\n<p>Talebiniz incelendikten sonra size 1-2 iş günü içinde dönüş yapılacaktır. İade onaylanırsa ürünü aşağıdaki adrese gönderebilirsiniz:</p>\n<p><strong>Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</strong></p>	t	2026-07-06 07:44:15.453276	2026-07-06 07:44:15.453276
23c4b118-ab1b-4e3c-8f27-8bd4fda696a5	kvkk-aydinlatma-metni	KVKK Aydınlatma Metni	<h2>KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) AYDINLATMA METNİ</h2>\n  <p>6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi gereğince, veri sorumlusu sıfatıyla Ahmet Uğur Durmaz (Sepetzen) olarak kişisel verilerinizin işlenmesi hakkında aşağıdaki bilgileri sizinle paylaşmaktayız.</p>\n\n  <h3>1. Veri Sorumlusunun Kimliği</h3>\n  <p>Ahmet Uğur Durmaz (Sepetzen), Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</p>\n  <p>E-posta: sepetzen@gmail.com | Telefon: 0536 630 11 38</p>\n\n  <h3>2. İşlenen Kişisel Veriler</h3>\n  <p>Sepetzen, aşağıdaki kişisel veri kategorilerini işlemektedir:</p>\n  <ul>\n  <li><strong>Kimlik Verileri:</strong> Ad, soyad</li>\n  <li><strong>İletişim Verileri:</strong> E-posta adresi, telefon numarası, teslimat adresi</li>\n  <li><strong>Sipariş ve İşlem Verileri:</strong> Sipariş geçmişi, satın alınan ürünler, ödeme bilgileri (kart numarası işlenmez; yalnızca ödeme başarı/başarısızlık durumu)</li>\n  <li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı bilgisi, çerez verileri</li>\n  <li><strong>Tercih Verileri:</strong> WhatsApp/SMS iletişim tercihleri</li>\n  </ul>\n\n  <h3>3. Kişisel Verilerin İşlenme Amaçları</h3>\n  <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>\n  <ul>\n  <li>Sipariş alımı, onayı ve teslim süreçlerinin yürütülmesi</li>\n  <li>Kargo ve teslimat işlemlerinin gerçekleştirilmesi</li>\n  <li>Müşteri hizmetleri ve şikâyet süreçlerinin yönetimi</li>\n  <li>Ödeme işlemlerinin güvenli biçimde gerçekleştirilmesi</li>\n  <li>Fatura ve yasal kayıtların tutulması</li>\n  <li>Onayınız doğrultusunda pazarlama iletişiminin yapılması (e-posta, SMS, WhatsApp)</li>\n  <li>Site güvenliğinin ve teknik altyapının sürdürülmesi</li>\n  <li>Yasal yükümlülüklerin yerine getirilmesi</li>\n  </ul>\n\n  <h3>4. Hukuki Dayanak</h3>\n  <p>Kişisel verileriniz aşağıdaki KVKK'daki hukuki dayanaklar çerçevesinde işlenmektedir:</p>\n  <ul>\n  <li>KVKK md. 5/2-c: Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (sipariş ve teslimat süreçleri)</li>\n  <li>KVKK md. 5/2-ç: Veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (fatura, vergi kaydı)</li>\n  <li>KVKK md. 5/2-f: Veri sorumlusunun meşru menfaati (site güvenliği, dolandırıcılık önleme)</li>\n  <li>KVKK md. 5/1: Açık rıza (pazarlama iletişimi)</li>\n  </ul>\n\n  <h3>5. Kişisel Verilerin Aktarımı</h3>\n  <p>Verileriniz; yasal zorunluluklar çerçevesinde kargo firmalarına, ödeme altyapı sağlayıcısına (iyzico) ve yetkili kamu kuruluşlarına aktarılabilir. Bu aktarımlar dışında verileriniz üçüncü taraflarla paylaşılmaz, satılmaz veya kiralanmaz.</p>\n\n  <h3>6. Kişisel Veri Saklama Süreleri</h3>\n  <ul>\n  <li>Sipariş ve fatura verileri: Yasal süre (10 yıl)</li>\n  <li>Müşteri hesap bilgileri: Hesap aktif olduğu sürece + 2 yıl</li>\n  <li>Pazarlama verileri: Rıza geri alınana kadar</li>\n  <li>Teknik/çerez verileri: Çerez türüne göre değişir (bkz. Çerez Politikası)</li>\n  </ul>\n\n  <h3>7. İlgili Kişi Hakları (KVKK Madde 11)</h3>\n  <p>KVKK'nın 11. maddesi kapsamında aşağıdaki haklarınızı kullanabilirsiniz:</p>\n  <ul>\n  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>\n  <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,</li>\n  <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>\n  <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme,</li>\n  <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>\n  <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme,</li>\n  <li>İşlemenin otomatik sistemler vasıtasıyla gerçekleştirilmesi durumunda ortaya çıkan aleyhte sonuca itiraz etme,</li>\n  <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>\n  </ul>\n  <p>Haklarınızı kullanmak için yazılı başvurunuzu <strong>sepetzen@gmail.com</strong> adresine iletebilirsiniz. Başvurularınız, kimliğinizi doğruladıktan sonra en geç 30 gün içinde yanıtlanacaktır.</p>\n\n  <h3>8. Güvenlik</h3>\n  <p>Kişisel verileriniz; yetkisiz erişim, kayıp veya ifşaya karşı SSL şifreleme, erişim kontrolü ve güvenli altyapı gibi teknik ve idari tedbirlerle korunmaktadır. Ödeme bilgileriniz, PCI-DSS sertifikalı iyzico altyapısı üzerinden 3D Secure sistemi ile işlenmekte olup Sepetzen tarafından saklanmamaktadır.</p>\n\n  <h3>9. Değişiklikler</h3>\n  <p>Bu Aydınlatma Metni, yasal düzenlemelere veya uygulamalarımızdaki değişikliklere bağlı olarak güncellenebilir. Güncel metne her zaman sepetzen.com adresinden ulaşabilirsiniz.</p>	t	2026-07-06 07:44:15.430758	2026-07-06 07:44:15.430758
5360fa0d-eda3-422c-a487-6b5f5cfad9f6	iptal-ve-iade-sartlari	İptal & İade Politikası	<h2>İPTAL VE İADE ŞARTLARI</h2>\n  <p>Müşteri memnuniyeti Sepetzen'in önceliğidir. 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği çerçevesinde iptal ve iade haklarınız aşağıda açıklanmıştır.</p>\n\n  <h3>1. Sipariş İptali</h3>\n  <p><strong>1.1. Kargoya Verilmeden Önce:</strong> Siparişiniz henüz kargoya verilmemişse, sepetzen@gmail.com adresine e-posta göndererek veya 0536 630 11 38 numaralı telefondan bize ulaşarak iptal talebinde bulunabilirsiniz. İptal onaylanması hâlinde ödemeniz aynı ödeme yöntemine iade edilir.</p>\n  <p><strong>1.2. Kargoya Verildikten Sonra:</strong> Sipariş kargoya verildikten sonra iptal mümkün değildir; bu durumda "İade Süreci" başlığı altındaki prosedürü izlemeniz gerekmektedir.</p>\n\n  <h3>2. Cayma Hakkı</h3>\n  <p>6502 sayılı Kanun gereğince, ürünü teslim aldığınız tarihten itibaren <strong>14 (on dört) gün</strong> içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayabilirsiniz.</p>\n  <p>Cayma hakkınızı kullanmak için:</p>\n  <ol>\n  <li>sepetzen@gmail.com adresine "cayma bildirimi" içeren bir e-posta gönderin.</li>\n  <li>E-postada sipariş numaranızı, adınızı ve cayma gerekçenizi (zorunlu değildir) belirtin.</li>\n  <li>Satıcı, cayma bildirimini aldıktan sonra en geç <strong>14 gün</strong> içinde ödemenizi iade eder.</li>\n  <li>Alıcı, cayma bildiriminden itibaren en geç <strong>10 gün</strong> içinde ürünü iade etmelidir.</li>\n  </ol>\n\n  <h3>3. İade Edilebilirlik Koşulları</h3>\n  <p>Ürünlerin iade edilebilmesi için aşağıdaki koşulların sağlanması gerekir:</p>\n  <ul>\n  <li>Ürün kullanılmamış ve hasar görmemiş olmalıdır.</li>\n  <li>Orijinal ambalajında, tüm aksesuarları ve belgeleri ile birlikte iade edilmelidir.</li>\n  <li>Teslim tarihinden itibaren 14 gün içinde cayma bildirimi yapılmış olmalıdır.</li>\n  </ul>\n\n  <h3>4. İade Dışı Ürünler</h3>\n  <p>Aşağıdaki durumlarda cayma hakkı kullanılamaz:</p>\n  <ul>\n  <li>Alıcının özel istekleri ve kişisel ihtiyaçları doğrultusunda özel olarak üretilen ürünler,</li>\n  <li>Koruyucu ambalajı açılmış, hijyen ve güvenlik açısından iadesi uygun olmayan ürünler,</li>\n  <li>Satın alındıktan sonra niteliği bozulan veya son kullanma tarihi geçen ürünler.</li>\n  </ul>\n\n  <h3>5. İade Prosedürü</h3>\n  <ol>\n  <li><strong>Bildirim:</strong> sepetzen@gmail.com adresine sipariş numarası ve iade nedeniyle birlikte e-posta gönderin.</li>\n  <li><strong>Onay:</strong> İade talebiniz 1-2 iş günü içinde değerlendirilerek tarafınıza bildirilir.</li>\n  <li><strong>Gönderim:</strong> Onay sonrasında ürünü orijinal ambalajında, tüm eksiksiz şekilde aşağıdaki adrese gönderin:<br><strong>Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla</strong></li>\n  <li><strong>İnceleme:</strong> Ürün tarafımıza ulaştıktan sonra 2-3 iş günü içinde kontrol edilir.</li>\n  <li><strong>İade:</strong> İade onaylanırsa ödemeniz 7-10 iş günü içinde orijinal ödeme yönteminize iade edilir.</li>\n  </ol>\n\n  <h3>6. İade Kargo Ücreti</h3>\n  <p>Cayma hakkı kapsamındaki iadelerde kargo ücreti <strong>alıcıya aittir</strong>. Ürün arızalı/hatalı teslim edilmişse kargo ücretini Sepetzen karşılar.</p>\n\n  <h3>7. Hasarlı veya Hatalı Teslimat</h3>\n  <p>Ürünü teslim alırken hasar gördüyseniz veya yanlış ürün gönderildiyse, kargo firmasıyla birlikte tutanak tutarak bize 48 saat içinde bildirin. Bu durumda Sepetzen, ürünün ücretsiz olarak değiştirilmesini veya iadesini sağlar.</p>\n\n  <h3>8. İletişim</h3>\n  <p>İptal ve iade talepleriniz için:<br>\n  <strong>E-posta:</strong> sepetzen@gmail.com<br>\n  <strong>Telefon / WhatsApp:</strong> 0536 630 11 38<br>\n  <strong>Çalışma Saatleri:</strong> Pazartesi–Cumartesi 09:00–18:00</p>	t	2026-07-06 07:44:15.440266	2026-07-06 07:44:15.440266
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: pending_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pending_payments (id, merchant_oid, session_id, customer_name, customer_email, customer_phone, shipping_address, cart_items, subtotal, shipping_cost, discount_amount, coupon_code, total, status, payment_token, created_at, expires_at, create_account, account_password_hash, client_ip, client_user_agent, iyzico_payment_id) FROM stdin;
8b9d8777-294c-4efd-9a7d-ec340e3c807b	HNK1768466921008RGJXC	T_eRV619lOsw9Ae3sTvmf4ZlZ3U6pmkU	Emir Şimşek	emirsimseekk@gmail.com	05308616785	{"city": "Beykoz", "address": "Molla Mehmet Sokak No:7", "district": "Beykoz", "postalCode": "34825"}	[{"price": "679.99", "quantity": 1, "productId": "23f56bbe-4ebd-4380-85f5-881e8267979a", "variantId": null, "productName": "SLIMFIT FIRST DREAM SERIES T-SHIRT SİYAH", "variantDetails": null}]	679.99	200.00	0.00	\N	879.99	token_received	\N	2026-01-15 08:48:41.009756	2026-01-15 09:48:41.008	f	\N	\N	\N	\N
\.


--
-- Data for Name: product_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_categories (id, product_id, category_id) FROM stdin;
93a5f305-57d1-4b63-9467-d831cb6c6107	c70ece06-707f-447e-a92a-45c83428436c	9ad27dda-5d85-4585-bf24-691167d18b81
fc216462-1740-4f9e-a455-41c7b2e7658e	c70ece06-707f-447e-a92a-45c83428436c	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
6b3f1bf0-2745-42f3-af1f-0c3bdbadc1b2	8e24eebf-1771-40e9-b241-a79cad1f79f5	9ad27dda-5d85-4585-bf24-691167d18b81
43850db8-3076-4b28-8f54-a56debd46071	8e24eebf-1771-40e9-b241-a79cad1f79f5	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
b426facd-3689-4fba-bee0-f99cb3173839	e9f3c19f-a6ee-433a-8e51-96fd27bdb608	9ad27dda-5d85-4585-bf24-691167d18b81
f8b6dcef-793b-4004-9639-982d627c9594	e9f3c19f-a6ee-433a-8e51-96fd27bdb608	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
76ac2f3a-6586-4a16-a3a2-db0f225dcdf5	22280bff-c2b2-4fad-a197-c5629ca79663	9ad27dda-5d85-4585-bf24-691167d18b81
1aa8b5a0-46b9-4332-a3a9-a781b1f11de9	22280bff-c2b2-4fad-a197-c5629ca79663	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
a8907b5f-a19d-4aec-9ba7-5f7f41f36ea8	90d40404-03fa-4bd4-b959-d86139dd36ab	9ad27dda-5d85-4585-bf24-691167d18b81
e5540db0-954a-41ba-875b-014b4c3e8d15	90d40404-03fa-4bd4-b959-d86139dd36ab	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
c048c303-5fdf-405d-8436-798046551bd6	98f5f31b-411e-4917-b96d-b0d9afcb7f18	9ad27dda-5d85-4585-bf24-691167d18b81
c32b983f-6991-49f7-95b6-6771376d6ba6	98f5f31b-411e-4917-b96d-b0d9afcb7f18	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
2660ac8d-3556-4d26-9611-1b78db2e5398	cee9f639-3670-4f0c-b873-371b8e3fdf6a	9ad27dda-5d85-4585-bf24-691167d18b81
beb3d7e7-542d-4b52-84eb-59508e814f6a	cee9f639-3670-4f0c-b873-371b8e3fdf6a	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16
\.


--
-- Data for Name: product_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_reviews (id, product_id, user_id, rating, title, content, is_approved, created_at, guest_name, guest_email, rejection_reason, approved_at, approved_by) FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, sku, size, color, color_hex, price, stock, is_active) FROM stdin;
02cdf129-9154-4b40-b980-0a6c843b9437	c70ece06-707f-447e-a92a-45c83428436c	SPZ-003-V1	\N	\N	\N	2000.00	50	t
50c10f5f-d092-4195-97b1-faaeba45b2e6	8e24eebf-1771-40e9-b241-a79cad1f79f5	SPZ-004-V1	\N	\N	\N	1099.00	50	t
13d6609f-389f-410a-9c4d-af8afb13b9d1	e9f3c19f-a6ee-433a-8e51-96fd27bdb608	SPZ-005-V1	\N	\N	\N	1099.00	50	t
10b12f99-6382-40ca-b839-707c180a7937	22280bff-c2b2-4fad-a197-c5629ca79663	SPZ-006-V1	\N	\N	\N	1299.00	50	t
c3143661-a01c-43d6-9b3f-451c500f5cab	90d40404-03fa-4bd4-b959-d86139dd36ab	SPZ-007-V1	\N	\N	\N	1299.00	50	t
59a5f03e-77f9-4da8-be27-da12a2d5c342	98f5f31b-411e-4917-b96d-b0d9afcb7f18	SPZ-001-V1	\N	\N	\N	2000.00	50	t
860d16ee-ff89-43c6-962b-7eb65c2b7e7f	cee9f639-3670-4f0c-b873-371b8e3fdf6a	SPZ-002-V1	\N	\N	\N	1199.00	50	t
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, slug, description, category_id, base_price, images, is_active, is_featured, is_new, created_at, updated_at, sku, available_sizes, available_colors, discount_badge) FROM stdin;
c70ece06-707f-447e-a92a-45c83428436c	El Yapımı Oymalı Katlanır Çakı – Keklik Desenli Sert Ahşap Saplı Özel Tasarım	el-yapimi-oymali-katlanir-caki-keklik-desenli	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">Keklik motifiyle el oyması yapılmış sert ahşap sap ve dayanıklı paslanmaz çelik bıçak. Kompakt katlanır yapısı sayesinde günlük ve outdoor kullanımda pratik avantaj sağlar.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>23 cm Toplam Uzunluk (Açık)</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>9,5 cm Bıçak Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>13 cm Sap Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Keklik motifli dekoratif oyma</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Katlanır cep tasarımı</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Paslanmaz çelik bıçak</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Keklik oymalı sert ahşap sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Pirinç pim donanım</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor aktiviteleri</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Doğa kullanım ihtiyaçları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Koleksiyon ve dekoratif kullanım</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎁</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Hediye Seçeneği</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Erkekler için şık ve anlamlı hediye</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Sağdıç hediyesi</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Babalar Günü hediyesi</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Kamp tutkunları için özel seçenek</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	2000.00	["/uploads/products/p622_1.png", "/uploads/products/p622_2.webp", "/uploads/products/p622_3.webp", "/uploads/products/p622_4.webp", "/uploads/products/p622_5.webp", "/uploads/products/p622_6.webp"]	t	t	t	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-003	[]	[]	Ücretsiz Kargo
8e24eebf-1771-40e9-b241-a79cad1f79f5	Epoksi Saplı El Yapımı Çakı Bıçağı	epoksi-sapli-el-yapimi-caki-bicagi	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">Stabilize epoksi sert ağaç saplı, dekoratif oymalı paslanmaz çelik bıçak. Tamamen el işçiliğiyle üretilmiş ve tek tek kontrol edilmiştir. Günlük ve outdoor kullanım için şık ve kullanışlı bir tasarım.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>17,5 cm Toplam Uzunluk</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>8 cm Bıçak Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>9,5 cm Sap Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Damla uçlu katlanır tasarım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Kılıf dahil değil</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Paslanmaz çelik bıçak</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Stabilize epoksi sert ağaç sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Oymalı yüzey detayı</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Pirinç pim yapısal destek</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük taşınabilir kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp alanı hazırlıkları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Açık hava aktiviteleri</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	1099.00	["/uploads/products/p628_1.jpg", "/uploads/products/p628_2.webp", "/uploads/products/p628_3.webp", "/uploads/products/p628_4.webp", "/uploads/products/p628_5.webp", "/uploads/products/p628_6.webp"]	t	f	f	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-004	[]	[]	\N
e9f3c19f-a6ee-433a-8e51-96fd27bdb608	Paslanmaz Çelik Katlanır Çakı – Kamp ve Outdoor Kullanım için El Yapımı Tasarım	paslanmaz-celik-katlanir-caki-kamp	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">Saten görünümlü paslanmaz çelik ve dayanıklı ergonomik sap kombinasyonu. Paracord detaylı tasarım ve kompakt yapısıyla outdoor kullanıma özel üretilmiştir.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>18 cm Toplam Uzunluk</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>8 cm Bıçak Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>10 cm Sap Uzunluğu (Kapalı)</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Damla uçlu katlanır tasarım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Kılıf dahil değil</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Saten görünümlü paslanmaz çelik</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>İnce gravür bıçak detayı</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Dayanıklı ergonomik sap (mavi kaplama)</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Paracord detaylı tasarım</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Yürüyüş ve doğa aktiviteleri</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp alanı hazırlıkları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük taşınabilir kullanım</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	1099.00	["/uploads/products/p627_1.jpg", "/uploads/products/p627_2.jpg", "/uploads/products/p627_3.jpg", "/uploads/products/p627_4.jpg", "/uploads/products/p627_5.jpg", "/uploads/products/p627_6.jpg"]	t	f	f	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-005	[]	[]	\N
22280bff-c2b2-4fad-a197-c5629ca79663	Oymalı Paslanmaz Çelik Detaylı, Reçine Saplı El Yapımı Katlanır Çakı	oymali-paslanmaz-celik-recine-sapli-katlanir-caki	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">Oyma detaylı paslanmaz çelik bıçak ve turkuaz reçine detaylı doğal sert ahşap sap kombinasyonu. Saten çelik kaplama ve pirinç pim detaylarıyla şık bir görünüm sunar.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>18 cm Toplam Uzunluk (Açık)</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>8 cm Bıçak Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>10 cm Sap Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Damla uçlu tasarım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Katlanır mekanizma</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Oyma detaylı paslanmaz çelik bıçak</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Turkuaz reçine detaylı doğal sert ahşap sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Pirinç pim detayları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Saten görünümlü çelik kaplama</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor aktiviteleri</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük taşınabilir kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Açık hava kullanım ihtiyaçları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Koleksiyon ve dekoratif kullanım</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	1299.00	["/uploads/products/p625_1.jpg", "/uploads/products/p625_2.jpg", "/uploads/products/p625_3.jpg", "/uploads/products/p625_4.jpg", "/uploads/products/p625_5.jpg", "/uploads/products/p625_6.jpg"]	t	t	f	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-006	[]	[]	\N
90d40404-03fa-4bd4-b959-d86139dd36ab	Premium El Yapımı Katlanır Çakı – Sert Ağaç Saplı Outdoor ve Günlük Kullanım Tasarımı	premium-el-yapimi-katlanir-caki-sert-agac-sapli	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">Görünür katmanlı Şam çeliği görünümlü özel bıçak yüzeyi ve masif sert ahşap sap. Her sap, doğal ahşap damar yapısı sayesinde benzersiz bir görünüme sahiptir. Tamamen el işçiliğiyle hazırlanmıştır.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>21,5 cm Toplam Uzunluk (Açık)</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>9 cm Bıçak Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>12,5 cm Sap Uzunluğu (Kapalı)</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Şam çeliği görünümlü özel kaplama</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Katlanır mekanizma</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Özel katmanlı Şam çeliği görünümlü bıçak yüzeyi</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Masif sert ahşap sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Pirinç pim donanım detayları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Tamamen el işçiliği üretim</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor aktiviteleri</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Açık hava kullanım ihtiyaçları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp alanı hazırlıkları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük taşınabilir kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Outdoor koleksiyon</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	1299.00	["/uploads/products/p624_1.jpg", "/uploads/products/p624_2.webp", "/uploads/products/p624_3.webp", "/uploads/products/p624_4.webp", "/uploads/products/p624_5.webp", "/uploads/products/p624_6.webp"]	t	t	t	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-007	[]	[]	\N
98f5f31b-411e-4917-b96d-b0d9afcb7f18	Ahşap Saplı İşlemeli Katlanır Çakı – Kamp, Outdoor ve Günlük Kullanım için Şık Tasarım	ahsap-sapli-islemeli-katlanir-caki	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">El işçiliğiyle üretilmiş, özel ahşap saplı katlanır çakı. İşlemeli tasarımı ve dayanıklı yapısıyla kamp, outdoor ve günlük kullanım için ideal bir seçenektir.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>23 cm Toplam Uzunluk</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>9,5 cm İşlemeli Bıçak</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>13 cm Sert Ağaç Sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Pirinç pim detayları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Güvenli katlanır mekanizma</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Paslanmaz çelik bıçak yüzeyi</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Sert ahşap sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Pirinç pim donanım</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor aktiviteleri</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Doğa kullanım ihtiyaçları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük taşınabilir kullanım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Koleksiyon ve dekoratif kullanım</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎁</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Hediye Seçeneği</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Erkekler için şık ve anlamlı hediye</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Babalar Günü hediyesi</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Kamp tutkunları için özel seçenek</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	2000.00	["/uploads/products/p623_1.jpg", "/uploads/products/p623_2.webp", "/uploads/products/p623_3.webp", "/uploads/products/p623_4.webp", "/uploads/products/p623_5.webp", "/uploads/products/p623_6.webp"]	t	t	f	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-001	[]	[]	Ücretsiz Kargo
cee9f639-3670-4f0c-b873-371b8e3fdf6a	El Yapımı Epoksi Saplı Katlanır Çakı – Paslanmaz Çelik Outdoor Tasarım	el-yapimi-epoksi-sapli-katlanir-caki	<p style="font-size:14px;line-height:1.75;color:#444;margin-bottom:20px">Hassas işlenmiş paslanmaz çelik bıçak ve ergonomik epoksi saplı el yapımı katlanır çakı. Her parça doğal damar yapısını koruyacak şekilde özenle üretilmiştir.</p><div style="border-top:1px solid #e5e7eb;padding-top:18px">\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">📐</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Teknik Özellikler</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>21 cm Toplam Uzunluk</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>9 cm Bıçak Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>11,5 cm Sap Uzunluğu</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Damla uçlu katlanır tasarım</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#2D5A27;flex-shrink:0;margin-top:5px"></span>Katlanır mekanizma</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🔩</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Materyal</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>İşlemeli paslanmaz çelik bıçak</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Epoksi reçine sap</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Pirinç pim detaylı cilalı yüzey</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700">◆</span>Ergonomik konturlu yapı</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎯</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Kullanım Alanları</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp ve outdoor aktiviteleri</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Açık hava kullanım ihtiyaçları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Kamp alanı hazırlıkları</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-weight:700;font-size:13px">✓</span>Günlük taşınabilir kullanım</li>\n    </ul>\n  </div>\n  <div style="margin-bottom:18px">\n    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">\n      <span style="font-size:16px">🎁</span>\n      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#2D5A27">Hediye Seçeneği</span>\n    </div>\n    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px">\n      <li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Outdoor tutkunları için ideal hediye</li><li style="display:flex;align-items:flex-start;gap:9px;font-size:13.5px;color:#333;line-height:1.5"><span style="color:#2D5A27;font-size:13px">→</span>Kamp ekipmanı arayan erkekler için</li>\n    </ul>\n  </div></div>	1bf9dcc6-c0f3-4df1-8f3e-aec6adccae16	1199.00	["/uploads/products/p626_1.webp", "/uploads/products/p626_2.jpg", "/uploads/products/p626_3.webp", "/uploads/products/p626_4.webp", "/uploads/products/p626_5.webp", "/uploads/products/p626_6.webp"]	t	t	f	2026-07-06 08:12:07.968654	2026-07-06 08:12:07.968654	SPZ-002	[]	[]	\N
\.


--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quote_items (id, quote_id, product_id, variant_id, product_name, product_image, variant_details, quantity, unit_price, discount_percent, line_total, product_sku) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotes (id, quote_number, dealer_id, status, valid_until, payment_terms, notes, subtotal, discount_total, grand_total, includes_vat, sent_at, accepted_at, rejected_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, user_id, admin_user_id, token, expires_at, created_at, revoked_at, user_agent, ip_address) FROM stdin;
9a17d85a-1333-4ecf-9f2b-abbd76041c16	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	bd0b8326ec731a53514c7f222cea26d8a5ba5448c3db84f7c750fba1179d003d5cf3927a9cdc098e941c746f72db6ff64fdeaa70da5213c83beebded7dcf6543	2026-05-04 01:54:30.309	2026-04-27 01:54:30.310838	2026-04-27 02:09:47.602	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
79f54c82-dedf-4f3b-b617-ca23a0fb4f3d	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	0b33d388aa4e8a735929d5bf38305a1e94e8c7a36a96f21958bf98e8f2a0a651641d714b6920d2c6db8bd83477f6d4c400f9d3fa521982b0427e457d3a2d2c0d	2026-05-04 02:09:47.686	2026-04-27 02:09:47.686922	2026-04-27 02:24:57.276	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
1025a694-fc52-4bfb-b669-f43f2a3f6622	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	213d3a8e312505c662568025f90ae181c72b960c77a601bd1fbc70a13f55a2d6cce1e1a9d146c4a1e0f12e97fc8facd46c3d6bd5c9e253e35cb83dd46d552e9f	2026-05-04 02:24:57.417	2026-04-27 02:24:57.418314	2026-04-27 02:40:23.282	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
c64eea3e-2067-4da1-a4ef-57744a68cf74	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	413289cb5a9b765beb140835ff56d1ef49c0bddf89486a3cad8ebd64f80d2cfd06358b21da5699a3155783f33d7fa21d912091a1a2d3adefe73e24cecb57d0df	2026-05-04 02:40:23.315	2026-04-27 02:40:23.316898	2026-04-27 09:57:43.867	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
fd907c4c-20d5-4f7e-bd92-0c4357125a4c	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	cf15eb787fd0d6ab3f114c440c94da211ed2d1b817be6a3f93f91b4d65fd48c7d867628c27a8525827bfca1f2f49090865ea68389dcf661b52aa8a56c23ba02e	2026-05-04 09:57:43.943	2026-04-27 09:57:43.944136	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
dbeb528f-8e1e-4c64-b032-9690922247bf	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	e719391b142092dd9cd4b9803ff436f00fb5f1ef4180a41bea229c3f8d2e1fdcda10b475da90b845ba6a0fef42df6da0ba87c4a0f917ef3be9f8f70663a35b74	2026-05-04 10:07:21.491	2026-04-27 10:07:21.494485	2026-04-27 10:22:31.54	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
25bed254-b308-4160-b376-bcd5193c445f	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	f7709c873e0f27c17f0d88b721540333082c7fb92ebcda8aaffddb35da4470788721c0eb3f0755a36341b7ac855409335aea89de4086b5c897fae1ea614788da	2026-05-04 01:19:43.683	2026-04-27 01:19:43.68462	\N	curl/8.14.1	127.0.0.1
4e9f7c33-35e8-4446-8c47-f1e86123fee0	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	ce4e524ffba10f0d0e4fb1cd9e4e4f0884fa4fe31b9b416bd60fcf85dd2e276d318767cbb2552f52d027d0992bdbc7cf03df8dd1729bcb3873f6031da4d07913	2026-05-04 01:23:41.772	2026-04-27 01:23:41.773941	2026-04-27 01:39:00.232	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
5eb2c22b-1a81-4e68-976b-54ba7d71a0e3	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	fd2942ea0e427588919815251722310d26ed414aaaa5dce290ff5155d35f275aac734c3a1ae1cc0f22024b2f6b764bfac4123a92f72b766d77a3d4fa4621bb1b	2026-05-04 01:39:00.271	2026-04-27 01:39:00.272253	2026-04-27 01:54:30.269	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
40fa51e9-e8e2-4796-a9f3-245b63f94709	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	171b4802845f2dd495f898a1dcf04d3e66ccbb745f7f6c389dcf77baa23c3aefac512e3748399f39bff18b0619ef53b8c1ad4e478f7e35040dfca1345da261a0	2026-05-04 10:22:31.574	2026-04-27 10:22:31.575658	2026-04-27 10:38:01.548	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
193767ab-1eb2-4245-9090-5579b207c2ec	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	8e9bbfa0708b26e03f930561daa9d68b76a6597c71416e87640e519f734863e89f8ea7874da1b8891fdd9abdd2dc6cd7ebe505e65f2d38cdfaca80320f8d98fc	2026-05-04 10:38:01.582	2026-04-27 10:38:01.583996	2026-04-27 10:53:31.536	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
8a87a593-e6fe-4026-9b2a-7bac9acb8137	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	a29c02c611f80f48605ce85603960f6f773b79bae9ac3c8fa4fbd0d12a49208738d2d2b4efabaae84aa3e63285abc06cbe06fad86b256aff9e15c884f39be2ae	2026-05-04 10:53:31.571	2026-04-27 10:53:31.572676	2026-04-27 11:09:01.545	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
74cee371-e47a-43af-a839-1171f6330697	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	21a418ca4f11f7d3ef7c6caac14d1671784868d3f49580f0bd955fe869c24dfa118bbd218f09944b571207e3c408a429edc9b560bd07f6fe66daaa746089baef	2026-05-04 11:09:01.677	2026-04-27 11:09:01.678807	2026-04-27 11:24:31.546	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
8cf4c8e1-c413-41cc-b311-ac278968366e	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	cd5b0bc5ec6ed88d7566ad4f298a105bb63befd54649e2fcf3baa7bf9359b37720d6f090501f5daa7d4a911fe742573203b0bc28ec0f46432fd41bea226fbf9a	2026-05-04 11:24:31.58	2026-04-27 11:24:31.581395	2026-04-27 11:40:01.097	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
3d2dfd41-55d4-4115-b8fa-b6f502bff76c	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	c60f18735cc1f7bc6245836b35748f741e38d886d6b80902b769486b8e0adaff2f62fe44480be847d1065a30b7acbacb87662d8b6fe6cff4a0598c17891f54d5	2026-05-04 11:40:01.132	2026-04-27 11:40:01.13293	2026-04-27 11:55:28.575	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
c75c315f-2b32-42c5-92c9-6af4329a582b	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	b4724b956866e512d754aac99d2bc157bfe9b9f083409e972af55a2c438f68375ea2aae8f8d2b69638f2419de889290caa1bf2cc41382b2c9093eed9140dd167	2026-05-04 11:55:28.609	2026-04-27 11:55:28.611029	2026-04-27 12:10:32.585	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
f3eb82ef-9e67-46f3-a2c1-99b8b1fe422d	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	d061738a4a6aa66ee6c06d9f420274c047abcb0b8f01325f47cdf843ea0e88010af8dd9404bb94aca31eb9299c64bb18b51c70684db4517c259912578306bac7	2026-05-04 12:10:32.696	2026-04-27 12:10:32.697126	2026-04-27 12:25:32.603	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
2f811132-74b0-47fd-9727-6be2d674d340	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	e0dd419c4cbb5a1d5c3314f7a2be97d932efe768bf09b4f17e6da0fb5371f795eb88ab53fd22cb00e145b2bfa32eb75fd3e46c13078ce67fb747bc400f08c43a	2026-05-04 12:25:32.638	2026-04-27 12:25:32.63979	2026-04-27 12:40:37.609	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
5687fb16-ab7a-4d5e-b8c1-7ae840ccebdb	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	a5ada11fd7088f1e127dba8005b43681d3b60a9a092f507f588b615ca7ed7571b1910ad46e668a608eba3d0975e8e54dbe62fb0ab3919d6e7215150a5a4d29de	2026-05-04 12:40:37.645	2026-04-27 12:40:37.646051	2026-04-27 12:55:54.617	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
0f9ff417-0ee3-4c8d-90be-e11fe765ec17	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	595209eccc51920073d79cbd2534a6a4dddd2bca3b446f328b10ee9403478892e17dcf4ced78830b47a9b5260d90c340b3b67ba2403ff58c7c80ea535dfc6f35	2026-05-04 12:55:54.66	2026-04-27 12:55:54.661534	2026-04-27 13:11:05.621	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
1866ee0d-8ffe-4423-a110-d4aee8efdb8a	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	2d5c22c0869aa4d1406ea552f1a7aa4d74dc99237d6d62bf15dec66f4bda00e6c85a483bda501043639459ef61d0f54abc98564b31af312f08fbd7da93534003	2026-05-04 14:57:56.733	2026-04-27 14:57:56.734761	2026-04-27 15:13:26.708	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
2203ddc1-acaa-45f0-84c8-c7b4d5ec0359	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	9b2e4b4bbb0d1b71ace444604146057f71696f4fb752deab6359cd050ea9533876762a71d6c51591a5b70cdd48c37241b1b73d9e404b98e4236ec4670a52cdae	2026-05-04 13:11:05.93	2026-04-27 13:11:05.931449	2026-04-27 13:26:08.301	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
c7c662c2-9e8b-4b9e-8620-c1b0c91f1144	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	96a0de8cc0c77055138c9c27bdad48110153270edc46d67820d12f8952414990dbef10b3b559517c1d618c860ca381dcb821fe7edb71a45bef1b27d7d258f277	2026-05-04 13:26:08.568	2026-04-27 13:26:08.569901	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
081ee731-a9a4-41bd-baf7-2176decd8aa3	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	627631e37986ba2cc5a9bbcb4b15f3654e9648eb018d55eb0487704559618bcdd3894836bd853c34fd6ed1810dc1526535410815fe6aa4f3a63b5c340190de3d	2026-05-04 13:26:08.571	2026-04-27 13:26:08.571534	2026-04-27 13:41:16.683	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
311ed56d-81b2-422f-a270-f0609de96780	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	7b0f5faf4fee402d25d87efbc8f685add851693c98c3f4567295ddcb47b8c476ce99f5a38aa9c4e7c49b989d9fde8c9b793db6b2e56be59a662cd43317be7a95	2026-05-04 13:41:16.718	2026-04-27 13:41:16.720071	2026-04-27 13:56:21.663	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
481ee239-c7f0-4182-a9ec-cc4037900a1e	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	a2dc1b2bec573799a01d5d52ed25c749083afdddfd10007d7de3d7e1b19f7b7c1bd6da32c348febbbf2f5f83840c80ea0a26196cc79976702e9cf75a0dd9277b	2026-05-04 13:56:21.694	2026-04-27 13:56:21.695202	2026-04-27 14:11:50.665	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
4ebee828-d54a-4787-be54-07594cfedfaf	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	d2214bedd3ce980e543ca1a928135b13cfe2d954cadca43ce6bfea0e5532cfc3ff1b7795863747eda76a0a10e4fdf6ac41b1023b5de379b3a14216d7fdf92051	2026-05-04 14:11:50.697	2026-04-27 14:11:50.698281	2026-04-27 14:27:11.683	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
77110b03-3745-46ae-91fd-5c317de7f92c	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	d8a3c7d74860a065cb6a902a326bccedc91abfeaf8a6c4239acbafcb6a4b78f3d9938aabefe659ba981326c5f77e8b4386ea8ff7fc0627bca95736023912adcd	2026-05-04 14:27:11.953	2026-04-27 14:27:11.954394	2026-04-27 14:42:40.678	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
cf4dc3bb-65cc-47cb-9f7f-131692f636d6	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	09b2036165c0876f9bc6ea72988ba89e28e081f0d48535767b68dd911f3972706b966c4bde0bf93b98b20a3ca476f7db5c09558fb87ee54453af00696d070230	2026-05-04 14:42:40.713	2026-04-27 14:42:40.714154	2026-04-27 14:57:56.697	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
68c90fa5-8da9-4dbf-a8b7-a6ae360ddd7e	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	f9a7b400b3d6ba71d55749c43aa10bc6edb9fc8b68b6cbc50307932c27b274bb5c1b55b2d722005fa8ac5b12470ea3452b03bff34e9dda0e46a264bf23b8d246	2026-05-04 15:13:26.751	2026-04-27 15:13:26.752841	2026-04-27 15:28:56.721	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
537c3abc-3421-4b47-ab88-147ef81dd735	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	a15efeb233c93f390e67503de92954eafbd7471561d4979efc79025d5b159209fcbde3271e2f50b6f865f57d12def2ef05c2e2d8de835295e8324e387bca92ab	2026-05-04 15:28:56.758	2026-04-27 15:28:56.758931	2026-04-27 15:44:26.724	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
31da04ed-6705-4ef1-bfe1-76f7747c1d25	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	1869b94f7739a151cc7389b08bb471c11404641af379a80fb567a7e9ba98a2a0f642200151cb0ab5282a8e071e09d86b13c4241e8cae42eb590e8d3973465282	2026-05-04 15:44:26.756	2026-04-27 15:44:26.756979	2026-04-27 15:59:31.744	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
c1c869c9-18a7-41f9-8ce8-01cc508e045b	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	8dbdd26af898150a533f5b985f66b242a142a30f6bffe64a85c5c299925d852afce60d81ae0abf1fadf4c96591a6151b978a33962d5b631bb42a195f64b544bc	2026-05-04 15:59:31.779	2026-04-27 15:59:31.780541	2026-04-27 16:15:01.747	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
9ba4382e-1b6b-4ba4-9c6d-26d9c661ff72	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	6bfb4ad476678686953fae7582b29535e4df4f452f8532334d3e72806572093e5b04a2fa3dbe788ec5cd5b64dd740829130f427e781a6fde4e64ea1a588708af	2026-05-04 16:15:01.791	2026-04-27 16:15:01.79145	2026-04-27 16:30:31.775	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
a5d2b53b-b3f6-48a3-9c85-eaead46f6008	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	f3a64dd28ea49f5aaa23bd86f38db0eadd2745b3b840c7168e1c6b69315ef1d2a3f6b4ca1f27dde48948e96e038a39ab5a3324f7c97028254ea3454cbfcd55f7	2026-05-04 16:30:31.825	2026-04-27 16:30:31.826924	2026-04-27 16:46:01.767	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
5e72962e-c1bb-4c83-a2e8-ac31653dceb2	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	4bad86c4731801ec66bd01684e796d285286a69dc2429c464e10d4102cbe53eea53a1cd0a519af060b6814f5b256859b475268112d3900e5fe56f0e082322f22	2026-05-04 16:46:01.793	2026-04-27 16:46:01.793782	2026-04-27 17:01:31.777	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
537b43cc-873b-4dcd-8498-c0d8eaca50ca	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	bd92e3a3516c835b67d3e603d53eae68360dce2b8d5fa3ae256bf066643597b81d7190f29bbe85443be264b6fe5cad20036bbf8cfdbbbe3a51d2551e9d2478d6	2026-05-04 17:01:31.887	2026-04-27 17:01:31.888316	2026-04-27 17:17:02.313	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
491a0a68-c267-41fe-9a9c-170dc6954941	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	9629f355d21e692704bce1fdce559abf1e9c6e0ffd0cc60a29dc7d0aeb91ee92385127b1a3b13b4e1d24a231b34deb9c01ea0fe0bc37bef2f9ca4baa0b3c03a0	2026-05-04 17:17:02.428	2026-04-27 17:17:02.428581	2026-04-27 17:54:21.577	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
7b02e5a8-d859-42ef-b3fb-fb890eb7e625	\N	2a866f13-67d0-43cf-8139-c6eb2266126e	336d62982f77d41f9be44798532722b82e9254c09a0a50abaed0013a462662f513e7674802bbc96540e1f9dec1508d4664ee15fb2fcd5919ab996168bf722a15	2026-05-04 17:54:21.679	2026-04-27 17:54:21.681216	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	127.0.0.1
\.


--
-- Data for Name: review_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.review_requests (id, order_id, user_id, sent_at, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (id, key, value, updated_at) FROM stdin;
0b9883ee-1487-4570-871f-b1d70a680400	wpileti_tpl_order_received_admin		2026-05-02 21:09:27.088
5e268416-95cb-4939-b5e3-1be445888d1a	wpileti_tpl_order_received_customer		2026-05-02 21:09:27.093
f264b572-1409-45c3-b7bd-7136e5f5028f	site_name	Sepetzen	2026-07-06 07:44:15.458063
e5ce9372-a67c-423c-b809-1544c5a5a9f6	site_email	sepetzen@gmail.com	2026-07-06 07:44:15.46126
67f8bbb7-9a40-46ba-a80d-c09739233674	site_phone	0536 630 11 38	2026-07-06 07:44:15.463723
a20dca3d-05c3-45a1-a09c-c8d90e0b6ad4	site_address	Karaçalı Mah. Nergiz Sk. No.8/A Dalaman / Muğla	2026-07-06 07:44:15.466968
9bcd7bcd-9998-40c9-9f25-0c7766b464ab	free_shipping_threshold	1500	2026-07-06 07:44:15.470061
88f8c19b-3f44-4a84-ba0c-51827103a3fc	contact_email	sepetzen@gmail.com	2026-07-06 08:03:28.964977
f5c4fe1c-cd4a-4a03-9287-c0591df711ae	contact_phone	0536 630 11 38	2026-07-06 08:03:28.964977
8d424d23-edba-4032-8e27-1c78e6748f26	whatsapp_number	905366301138	2026-07-06 08:03:28.964977
ab89f37b-a3f7-4523-b845-36a0489ad7e2	announcement_bar	1500 TL üzeri alışverişlerde kargo ÜCRETSİZ! 🚚	2026-07-06 08:03:28.964977
\.


--
-- Data for Name: size_charts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.size_charts (id, category_id, columns, rows, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_adjustments (id, variant_id, previous_stock, new_stock, adjustment_type, reason, author_id, created_at) FROM stdin;
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_addresses (id, user_id, title, first_name, last_name, phone, address, city, district, postal_code, is_default, created_at, updated_at, country) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (sid, sess, expire) FROM stdin;
91ZxtU9H2nuCPxcLSxYpyBnaLjQx_IKT	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T10:23:55.536Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 10:37:55
fcOXhWacafAmEb6t80SyWTwyegHEj3qi	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T15:45:13.424Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 15:45:24
to0ZqFeEeIr1pve00n0a4RMPrlRB7njE	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-20T16:01:37.707Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-20 16:01:45
MRYvMTSrfh_P5X4eTBjgsA8Hr9cBKj3Z	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T10:23:52.582Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 10:23:56
SMQioy1ETyMGXS-dM38gnq-L7eUD6mLG	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T15:01:10.612Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 15:01:19
x6hTa0BYwRS52gFM0LpefDVWgprCoita	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T15:13:19.392Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 15:13:32
f5YZ4rLvfRr2BuzYYdy4ysIF8OGzOtFu	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-20T15:57:58.212Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 15:57:05
FTCAgXaN8vXrlKyJ-WBKFuD_BIbGo7rw	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-20T16:08:46.400Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-20 16:08:53
QjQf_QvGow-XWE_X6xOSSzfPrriuSid_	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T10:27:49.848Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 10:32:42
DMR9_73aZXFRzC2kDTJBqGYdimVsEwgy	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-20T16:36:00.871Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-20 16:36:10
jm4GHKrWvkSm3I0XdPp0BY6BoMhCqHqJ	{"cookie":{"originalMaxAge":86399999,"expires":"2026-01-21T16:00:55.682Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 16:06:04
cgtq2wJwC5iqwOsWARtMrrLgLzyIcpvH	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-21T10:59:21.863Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-21 10:59:30
Fgvy8BJNVwuklWgKv0s1aI73gPENymut	{"cookie":{"originalMaxAge":86400000,"expires":"2026-01-20T22:01:45.511Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-01-20 22:01:56
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, first_name, last_name, phone, created_at, address, city, district, postal_code, country) FROM stdin;
60f9759c-3a71-412d-b772-500593f08536	emirsimseekk@gmail.com	$2b$10$z5qMt5OFIiPs0tUo7C88N.PAZEpocMKpTT.ANvW43aYvVRGwShH.6	Emir	Şimşek	05308616785	2026-01-08 18:07:37.844715	\N	\N	\N	\N	Türkiye
\.


--
-- Data for Name: woocommerce_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.woocommerce_settings (id, site_url, consumer_key, consumer_secret, is_active, last_sync, created_at, updated_at) FROM stdin;
5b36f347-7c35-4c46-aeda-f0b8a163cb43	https://hank.com.tr	ck_15b02bfc8934adfae9954229ed298002393f2b8d	cs_d5984eda3fb110d8e0a112b7d1177eb18e3384bb	t	2026-01-08 23:19:05.613	2026-01-08 23:17:48.37093	2026-01-08 23:17:48.37093
\.


--
-- Data for Name: woocommerce_sync_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.woocommerce_sync_logs (id, status, products_imported, categories_imported, images_downloaded, errors, started_at, completed_at) FROM stdin;
41fa794d-4daa-4182-8024-9ab2a4688017	completed	43	3	188	[]	2026-01-08 23:17:51.351613	2026-01-08 23:18:39.874
01975c57-fbf2-4bf8-b970-332ad29970d8	completed	0	0	0	[]	2026-01-08 23:18:55.312374	2026-01-08 23:19:05.616
\.


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_unique UNIQUE (username);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_unique UNIQUE (slug);


--
-- Name: coupon_redemptions coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_unique UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: dealers dealers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dealers
    ADD CONSTRAINT dealers_pkey PRIMARY KEY (id);


--
-- Name: email_jobs email_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_jobs
    ADD CONSTRAINT email_jobs_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: influencer_payments influencer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencer_payments
    ADD CONSTRAINT influencer_payments_pkey PRIMARY KEY (id);


--
-- Name: low_stock_alerts low_stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: low_stock_alerts low_stock_alerts_variant_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_variant_id_unique UNIQUE (variant_id);


--
-- Name: marketplace_categories marketplace_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_categories
    ADD CONSTRAINT marketplace_categories_pkey PRIMARY KEY (id);


--
-- Name: marketplace_products marketplace_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT marketplace_products_pkey PRIMARY KEY (id);


--
-- Name: marketplace_sync_runs marketplace_sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_sync_runs
    ADD CONSTRAINT marketplace_sync_runs_pkey PRIMARY KEY (id);


--
-- Name: marketplaces marketplaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplaces
    ADD CONSTRAINT marketplaces_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_notes order_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_notes
    ADD CONSTRAINT order_notes_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_unique UNIQUE (token);


--
-- Name: pending_payments pending_payments_merchant_oid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_payments
    ADD CONSTRAINT pending_payments_merchant_oid_unique UNIQUE (merchant_oid);


--
-- Name: pending_payments pending_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_payments
    ADD CONSTRAINT pending_payments_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_unique UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: review_requests review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_pkey PRIMARY KEY (id);


--
-- Name: user_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: site_settings site_settings_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_unique UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: size_charts size_charts_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_charts
    ADD CONSTRAINT size_charts_category_id_key UNIQUE (category_id);


--
-- Name: size_charts size_charts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_charts
    ADD CONSTRAINT size_charts_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: user_addresses user_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: woocommerce_settings woocommerce_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woocommerce_settings
    ADD CONSTRAINT woocommerce_settings_pkey PRIMARY KEY (id);


--
-- Name: woocommerce_sync_logs woocommerce_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.woocommerce_sync_logs
    ADD CONSTRAINT woocommerce_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.user_sessions USING btree (expire);


--
-- Name: idx_mp_cat_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_cat_lookup ON public.marketplace_categories USING btree (marketplace_id, external_id);


--
-- Name: idx_mp_prod_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_prod_lookup ON public.marketplace_products USING btree (marketplace_id, external_id);


--
-- Name: idx_mp_runs_mp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mp_runs_mp ON public.marketplace_sync_runs USING btree (marketplace_id, started_at DESC);


--
-- Name: idx_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_expire ON public.user_sessions USING btree (expire);


--
-- Name: uniq_mp_cat_external; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_mp_cat_external ON public.marketplace_categories USING btree (marketplace_id, external_id);


--
-- Name: uniq_mp_prod_external; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_mp_prod_external ON public.marketplace_products USING btree (marketplace_id, external_id);


--
-- Name: uniq_mp_running_per_marketplace; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_mp_running_per_marketplace ON public.marketplace_sync_runs USING btree (marketplace_id) WHERE (status = 'running'::text);


--
-- Name: campaigns campaigns_coupon_id_coupons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_coupon_id_coupons_id_fk FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;


--
-- Name: cart_items cart_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_variant_id_product_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_coupon_id_coupons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_coupons_id_fk FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: coupon_redemptions coupon_redemptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_jobs email_jobs_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_jobs
    ADD CONSTRAINT email_jobs_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: influencer_payments influencer_payments_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencer_payments
    ADD CONSTRAINT influencer_payments_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: low_stock_alerts low_stock_alerts_variant_id_product_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.low_stock_alerts
    ADD CONSTRAINT low_stock_alerts_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: marketplace_categories marketplace_categories_marketplace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_categories
    ADD CONSTRAINT marketplace_categories_marketplace_id_fkey FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) ON DELETE CASCADE;


--
-- Name: marketplace_categories marketplace_categories_site_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_categories
    ADD CONSTRAINT marketplace_categories_site_category_id_fkey FOREIGN KEY (site_category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: marketplace_products marketplace_products_marketplace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT marketplace_products_marketplace_id_fkey FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) ON DELETE CASCADE;


--
-- Name: marketplace_products marketplace_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_products
    ADD CONSTRAINT marketplace_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: marketplace_sync_runs marketplace_sync_runs_marketplace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_sync_runs
    ADD CONSTRAINT marketplace_sync_runs_marketplace_id_fkey FOREIGN KEY (marketplace_id) REFERENCES public.marketplaces(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_variant_id_product_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE SET NULL;


--
-- Name: order_notes order_notes_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_notes
    ADD CONSTRAINT order_notes_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_categories product_categories_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: quote_items quote_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: quotes quotes_dealer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES public.dealers(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: review_requests review_requests_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: review_requests review_requests_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_requests
    ADD CONSTRAINT review_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: size_charts size_charts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.size_charts
    ADD CONSTRAINT size_charts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: stock_adjustments stock_adjustments_variant_id_product_variants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: user_addresses user_addresses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_addresses
    ADD CONSTRAINT user_addresses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict IoiLINmRHbLe5pvC7CX025Gt24iqsmFbot6P0ygzrMKQRroA17VZhmDfhM055No

