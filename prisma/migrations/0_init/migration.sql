-- CreateTable
CREATE TABLE "app_settings" (
    "app_setting_id" SERIAL NOT NULL,
    "branch_id" INTEGER,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT,
    "setting_type" VARCHAR(50),
    "setting_category" VARCHAR(100),
    "description" TEXT,
    "is_public" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("app_setting_id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "reminder_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "reminder_type_id" INTEGER NOT NULL,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "delivery_status" VARCHAR(50),
    "error_message" TEXT,
    "recipient_contact" VARCHAR(200),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "appointment_reschedules" (
    "reschedule_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "proposed_by_user_id" INTEGER NOT NULL,
    "proposed_date" DATE NOT NULL,
    "proposed_start_time" TIME(6) NOT NULL,
    "proposed_end_time" TIME(6) NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "approved_by_user_id" INTEGER,
    "approved_at" TIMESTAMP(6),
    "rejected_by_user_id" INTEGER,
    "rejected_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reschedules_pkey" PRIMARY KEY ("reschedule_id")
);

-- CreateTable
CREATE TABLE "appointment_status_history" (
    "history_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "old_status_id" INTEGER,
    "new_status_id" INTEGER NOT NULL,
    "changed_by_user_id" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "appointment_status_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "appointment_statuses" (
    "appointment_status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(20),
    "status_color" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "appointment_statuses_pkey" PRIMARY KEY ("appointment_status_id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "appointment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "specialty_id" INTEGER,
    "appointment_status_id" INTEGER NOT NULL,
    "appointment_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "appointment_type" VARCHAR(50),
    "reason" VARCHAR(500),
    "notes" TEXT,
    "room" VARCHAR(100),
    "duration" INTEGER DEFAULT 30,
    "price" DECIMAL(10,2),
    "payment_method" VARCHAR(50),
    "voucher" TEXT,
    "selected_promotion_id" INTEGER,
    "confirmed" BOOLEAN DEFAULT false,
    "confirmed_at" TIMESTAMPTZ(6),
    "confirmed_by" INTEGER,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" INTEGER,
    "cancellation_reason" TEXT,
    "arrived_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMP(6),
    "approved_by" INTEGER,
    "approval_notes" TEXT,
    "rejected_at" TIMESTAMP(6),
    "rejected_by" INTEGER,
    "rejection_reason" TEXT,
    "no_show_at" TIMESTAMP(6),
    "no_show_notes" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_log_id" SERIAL NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "record_id" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_fields" JSONB,
    "user_id" INTEGER,
    "branch_id" INTEGER,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateTable
CREATE TABLE "blood_types" (
    "blood_type_id" SERIAL NOT NULL,
    "blood_type_name" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "blood_types_pkey" PRIMARY KEY ("blood_type_id")
);

-- CreateTable
CREATE TABLE "branches" (
    "branch_id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_name" VARCHAR(200) NOT NULL,
    "branch_code" VARCHAR(20),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Peru',
    "postal_code" VARCHAR(20),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "is_main_office" BOOLEAN DEFAULT false,
    "administrator_id" INTEGER,
    "configuration" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "mobile" VARCHAR(20),
    "manager_name" VARCHAR(200),
    "manager_phone" VARCHAR(20),
    "opening_hours" TEXT,
    "department" VARCHAR(100),
    "notes" TEXT,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("branch_id")
);

-- CreateTable
CREATE TABLE "budget_details" (
    "budget_detail_id" SERIAL NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "dental_procedure_id" INTEGER NOT NULL,
    "tooth_position_id" INTEGER,
    "tooth_surface_id" INTEGER,
    "description" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "definitive_condition_id" INTEGER,

    CONSTRAINT "budget_details_pkey" PRIMARY KEY ("budget_detail_id")
);

-- CreateTable
CREATE TABLE "budget_statuses" (
    "budget_status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(20),
    "status_color" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "budget_statuses_pkey" PRIMARY KEY ("budget_status_id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "budget_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "treatment_plan_id" INTEGER,
    "budget_status_id" INTEGER NOT NULL,
    "budget_number" VARCHAR(50),
    "budget_date" DATE NOT NULL,
    "valid_until" DATE,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "tax_percentage" DECIMAL(5,2) DEFAULT 0,
    "tax_amount" DECIMAL(10,2) DEFAULT 0,
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "accepted_by_patient" BOOLEAN DEFAULT false,
    "accepted_date" DATE,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("budget_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "company_id" SERIAL NOT NULL,
    "company_name" VARCHAR(200) NOT NULL,
    "tax_id" VARCHAR(50),
    "ruc" VARCHAR(50),
    "legal_name" VARCHAR(200),
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "website" VARCHAR(200),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Colombia',
    "postal_code" VARCHAR(20),
    "logo_url" TEXT,
    "contact_person" VARCHAR(200),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "company_contracts" (
    "company_contract_id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "contract_number" VARCHAR(50),
    "contract_type" VARCHAR(100) NOT NULL,
    "contract_date" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "coverage_details" JSONB,
    "discount_percentage" DECIMAL(5,2),
    "contract_content" TEXT,
    "contract_file_url" TEXT,
    "is_signed" BOOLEAN DEFAULT false,
    "signed_date" DATE,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "company_contracts_pkey" PRIMARY KEY ("company_contract_id")
);

-- CreateTable
CREATE TABLE "consent_templates" (
    "consent_template_id" SERIAL NOT NULL,
    "template_name" VARCHAR(200) NOT NULL,
    "template_code" VARCHAR(50),
    "template_category" VARCHAR(100),
    "template_content" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "version" INTEGER DEFAULT 1,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "consent_templates_pkey" PRIMARY KEY ("consent_template_id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "contract_template_id" SERIAL NOT NULL,
    "template_name" VARCHAR(200) NOT NULL,
    "template_code" VARCHAR(50),
    "template_type" VARCHAR(50) NOT NULL,
    "template_category" VARCHAR(50) DEFAULT 'servicios',
    "description" TEXT,
    "price" DECIMAL(10,2),
    "duration" VARCHAR(100),
    "template_content" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "branch_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("contract_template_id")
);

-- CreateTable
CREATE TABLE "consultation_rooms" (
    "consultation_room_id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "room_name" VARCHAR(100) NOT NULL,
    "room_code" VARCHAR(20),
    "floor" VARCHAR(20),
    "capacity" INTEGER DEFAULT 1,
    "equipment_description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "consultation_rooms_pkey" PRIMARY KEY ("consultation_room_id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "consultation_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "consultation_date" DATE NOT NULL,
    "consultation_time" TIME(6) NOT NULL,
    "chief_complaint" TEXT,
    "present_illness" TEXT,
    "vital_signs" JSONB,
    "physical_examination" TEXT,
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "prescriptions_given" TEXT,
    "recommendations" TEXT,
    "next_visit_date" DATE,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "general_condition" TEXT,
    "extraoral_exam" TEXT,
    "extraoral_exam_images" JSONB DEFAULT '[]',
    "intraoral_exam" TEXT,
    "intraoral_exam_images" JSONB DEFAULT '[]',
    "treatment_performed" TEXT,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("consultation_id")
);

-- CreateTable
CREATE TABLE "dental_procedures" (
    "dental_procedure_id" SERIAL NOT NULL,
    "procedure_code" VARCHAR(20),
    "procedure_name" VARCHAR(200) NOT NULL,
    "procedure_category" VARCHAR(100),
    "description" TEXT,
    "default_price" DECIMAL(10,2),
    "estimated_duration" INTEGER,
    "requires_anesthesia" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "dental_procedures_pkey" PRIMARY KEY ("dental_procedure_id")
);

-- CreateTable
CREATE TABLE "dentist_schedules" (
    "schedule_id" SERIAL NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "slot_duration" INTEGER DEFAULT 30,
    "is_available" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "dentist_schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "dentist_specialties" (
    "dentist_specialty_id" SERIAL NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "specialty_id" INTEGER NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_registration" INTEGER,
    "date_time_modification" TIMESTAMP(6),
    "user_id_modification" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',

    CONSTRAINT "dentist_specialties_pkey" PRIMARY KEY ("dentist_specialty_id")
);

-- CreateTable
CREATE TABLE "dentists" (
    "dentist_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "specialty_id" INTEGER,
    "professional_license" VARCHAR(50) NOT NULL,
    "license_country" VARCHAR(100) DEFAULT 'Colombia',
    "license_expiry_date" DATE,
    "bio" TEXT,
    "years_experience" INTEGER,
    "consultation_fee" DECIMAL(10,2),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "dentists_pkey" PRIMARY KEY ("dentist_id")
);

-- CreateTable
CREATE TABLE "diagnosis_options" (
    "diagnosis_option_id" SERIAL NOT NULL,
    "diagnosis_code" VARCHAR(20),
    "diagnosis_name" VARCHAR(200) NOT NULL,
    "diagnosis_category" VARCHAR(100),
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "diagnosis_options_pkey" PRIMARY KEY ("diagnosis_option_id")
);

-- CreateTable
CREATE TABLE "diagnostic_conditions" (
    "diagnostic_condition_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "diagnosis_option_id" INTEGER,
    "condition_description" TEXT NOT NULL,
    "severity" VARCHAR(20),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "diagnostic_conditions_pkey" PRIMARY KEY ("diagnostic_condition_id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "document_type_id" SERIAL NOT NULL,
    "type_name" VARCHAR(100) NOT NULL,
    "type_code" VARCHAR(20),
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("document_type_id")
);

-- CreateTable
CREATE TABLE "genders" (
    "gender_id" SERIAL NOT NULL,
    "gender_name" VARCHAR(50) NOT NULL,
    "gender_code" VARCHAR(10),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "genders_pkey" PRIMARY KEY ("gender_id")
);

-- CreateTable
CREATE TABLE "health_plan_settings" (
    "health_plan_setting_id" SERIAL NOT NULL,
    "health_plan_id" INTEGER NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT,
    "setting_type" VARCHAR(50),
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "health_plan_settings_pkey" PRIMARY KEY ("health_plan_setting_id")
);

-- CreateTable
CREATE TABLE "health_plan_subscriptions" (
    "subscription_id" SERIAL NOT NULL,
    "health_plan_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "subscription_number" VARCHAR(50),
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "subscription_status" VARCHAR(50) DEFAULT 'active',
    "policy_number" VARCHAR(100),
    "subscriber_name" VARCHAR(200),
    "subscriber_relationship" VARCHAR(50),
    "copay_amount" DECIMAL(10,2),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "voucher_url" VARCHAR(500),
    "payment_method" VARCHAR(50),
    "approval_status" VARCHAR(50) DEFAULT 'pending',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ(6),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "first_free_consultation_used" BOOLEAN DEFAULT false,
    "first_free_consultation_date" DATE,

    CONSTRAINT "health_plan_subscriptions_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "health_plan_terms" (
    "health_plan_term_id" SERIAL NOT NULL,
    "health_plan_id" INTEGER NOT NULL,
    "term_type" VARCHAR(50) NOT NULL,
    "term_description" TEXT NOT NULL,
    "term_value" VARCHAR(200),
    "effective_date" DATE,
    "expiry_date" DATE,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "health_plan_terms_pkey" PRIMARY KEY ("health_plan_term_id")
);

-- CreateTable
CREATE TABLE "health_plans" (
    "health_plan_id" SERIAL NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "plan_code" VARCHAR(50),
    "plan_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "monthly_fee" DECIMAL(10,2),
    "enrollment_fee" DECIMAL(10,2),
    "coverage_details" JSONB,
    "max_subscribers" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "health_plans_pkey" PRIMARY KEY ("health_plan_id")
);

-- CreateTable
CREATE TABLE "identification_types" (
    "identification_type_id" SERIAL NOT NULL,
    "type_name" VARCHAR(50) NOT NULL,
    "type_code" VARCHAR(10),
    "country" VARCHAR(100),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "identification_types_pkey" PRIMARY KEY ("identification_type_id")
);

-- CreateTable
CREATE TABLE "inventory_categories" (
    "inventory_category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "category_code" VARCHAR(50),
    "parent_category_id" INTEGER,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "color" VARCHAR(20) DEFAULT '#3b82f6',

    CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("inventory_category_id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "inventory_item_id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "inventory_category_id" INTEGER,
    "item_code" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "unit_of_measure" VARCHAR(50),
    "current_quantity" DECIMAL(10,2) DEFAULT 0,
    "minimum_quantity" DECIMAL(10,2) DEFAULT 0,
    "maximum_quantity" DECIMAL(10,2),
    "unit_cost" DECIMAL(10,2),
    "supplier_name" VARCHAR(200),
    "supplier_contact" TEXT,
    "location" VARCHAR(100),
    "expiry_date" DATE,
    "batch_number" VARCHAR(100),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("inventory_item_id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "lab_result_id" SERIAL NOT NULL,
    "laboratory_request_id" INTEGER NOT NULL,
    "result_date" DATE NOT NULL,
    "result_summary" TEXT,
    "result_file_url" TEXT,
    "technician_name" VARCHAR(200),
    "technician_notes" TEXT,
    "quality_check_passed" BOOLEAN DEFAULT true,
    "quality_check_notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("lab_result_id")
);

-- CreateTable
CREATE TABLE "laboratory_pricing" (
    "pricing_id" SERIAL NOT NULL,
    "pricing_type" VARCHAR(50) NOT NULL,
    "pricing_data" JSONB NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "laboratory_pricing_pkey" PRIMARY KEY ("pricing_id")
);

-- CreateTable
CREATE TABLE "laboratory_requests" (
    "laboratory_request_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "consultation_id" INTEGER,
    "request_date" DATE NOT NULL,
    "laboratory_name" VARCHAR(200),
    "request_type" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "urgency" VARCHAR(20) DEFAULT 'normal',
    "request_status" VARCHAR(50) DEFAULT 'pending',
    "expected_delivery_date" DATE,
    "actual_delivery_date" DATE,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "laboratory_requests_pkey" PRIMARY KEY ("laboratory_request_id")
);

-- CreateTable
CREATE TABLE "laboratory_service_prices" (
    "service_price_id" SERIAL NOT NULL,
    "service_code" VARCHAR(50) NOT NULL,
    "service_name" VARCHAR(200) NOT NULL,
    "service_category" VARCHAR(50) NOT NULL,
    "service_subcategory" VARCHAR(100),
    "base_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'PEN',
    "has_quantity" BOOLEAN DEFAULT false,
    "quantity_unit" VARCHAR(50),
    "has_options" BOOLEAN DEFAULT false,
    "options_config" JSONB,
    "legacy_field_name" VARCHAR(50),
    "description" TEXT,
    "help_text" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "laboratory_service_prices_pkey" PRIMARY KEY ("service_price_id")
);

-- CreateTable
CREATE TABLE "laboratory_services" (
    "laboratory_service_id" SERIAL NOT NULL,
    "service_name" VARCHAR(200) NOT NULL,
    "service_code" VARCHAR(50),
    "service_category" VARCHAR(100),
    "description" TEXT,
    "estimated_turnaround_days" INTEGER,
    "default_cost" DECIMAL(10,2),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "laboratory_services_pkey" PRIMARY KEY ("laboratory_service_id")
);

-- CreateTable
CREATE TABLE "marital_statuses" (
    "marital_status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(10),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "marital_statuses_pkey" PRIMARY KEY ("marital_status_id")
);

-- CreateTable
CREATE TABLE "medical_histories" (
    "medical_history_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "has_allergies" BOOLEAN DEFAULT false,
    "allergies_description" TEXT,
    "has_chronic_diseases" BOOLEAN DEFAULT false,
    "chronic_diseases_description" TEXT,
    "has_medications" BOOLEAN DEFAULT false,
    "current_medications" TEXT,
    "has_surgeries" BOOLEAN DEFAULT false,
    "surgeries_description" TEXT,
    "has_bleeding_disorders" BOOLEAN DEFAULT false,
    "bleeding_disorders_description" TEXT,
    "has_diabetes" BOOLEAN DEFAULT false,
    "has_hypertension" BOOLEAN DEFAULT false,
    "has_heart_disease" BOOLEAN DEFAULT false,
    "heart_disease_description" TEXT,
    "is_pregnant" BOOLEAN,
    "pregnancy_months" INTEGER,
    "is_breastfeeding" BOOLEAN,
    "smokes" BOOLEAN DEFAULT false,
    "smoking_frequency" VARCHAR(50),
    "drinks_alcohol" BOOLEAN DEFAULT false,
    "alcohol_frequency" VARCHAR(50),
    "last_dental_visit" DATE,
    "dental_visit_reason" VARCHAR(200),
    "additional_notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "pathological_background" JSONB DEFAULT '[]',

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("medical_history_id")
);

-- CreateTable
CREATE TABLE "medication_units" (
    "medication_unit_id" SERIAL NOT NULL,
    "unit_name" VARCHAR(50) NOT NULL,
    "unit_abbreviation" VARCHAR(10),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "medication_units_pkey" PRIMARY KEY ("medication_unit_id")
);

-- CreateTable
CREATE TABLE "medications" (
    "medication_id" SERIAL NOT NULL,
    "medication_name" VARCHAR(200) NOT NULL,
    "generic_name" VARCHAR(200),
    "medication_type" VARCHAR(100),
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "concentration" VARCHAR(100),

    CONSTRAINT "medications_pkey" PRIMARY KEY ("medication_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "patient_id" INTEGER,
    "notification_type" VARCHAR(50) NOT NULL,
    "notification_title" VARCHAR(200) NOT NULL,
    "notification_message" TEXT NOT NULL,
    "notification_data" JSONB,
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "priority" VARCHAR(20) DEFAULT 'normal',
    "expires_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "odontogram_condition_procedures" (
    "condition_procedure_id" SERIAL NOT NULL,
    "odontogram_condition_id" INTEGER NOT NULL,
    "procedure_name" VARCHAR(200) NOT NULL,
    "procedure_code" VARCHAR(20),
    "observations" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "price_without_plan" DECIMAL(10,2),
    "price_plan_personal" DECIMAL(10,2),
    "price_plan_familiar" DECIMAL(10,2),
    "price_plan_platinium" DECIMAL(10,2),
    "price_plan_oro" DECIMAL(10,2),
    "specialty" VARCHAR(100),
    "applies_to_state" VARCHAR(10),

    CONSTRAINT "odontogram_condition_procedures_pkey" PRIMARY KEY ("condition_procedure_id")
);

-- CreateTable
CREATE TABLE "odontogram_conditions" (
    "condition_id" SERIAL NOT NULL,
    "odontogram_id" INTEGER NOT NULL,
    "tooth_position_id" INTEGER NOT NULL,
    "description" TEXT,
    "severity" VARCHAR(20),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "dental_condition_id" INTEGER,
    "tooth_surface_id" INTEGER,
    "price" DECIMAL(10,2) DEFAULT 0.00,
    "surface_section" VARCHAR(50),
    "custom_tooth_price" DECIMAL(10,2),

    CONSTRAINT "odontogram_conditions_pkey" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "odontogram_dental_conditions" (
    "condition_id" SERIAL NOT NULL,
    "condition_code" VARCHAR(50) NOT NULL,
    "condition_name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "cie10_code" VARCHAR(10),
    "abbreviation" VARCHAR(10),
    "abbreviations" JSONB,
    "description" TEXT,
    "specifications" TEXT,
    "default_price" DECIMAL(10,2),
    "symbol_type" VARCHAR(30) NOT NULL,
    "color_type" VARCHAR(10) NOT NULL,
    "fill_surfaces" BOOLEAN DEFAULT false,
    "between_teeth" BOOLEAN DEFAULT false,
    "color_conditional" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "price_base" DECIMAL(10,2),
    "price_state_good" DECIMAL(10,2),
    "price_state_bad" DECIMAL(10,2),

    CONSTRAINT "odontogram_dental_conditions_pkey" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "odontogram_treatments" (
    "odontogram_treatment_id" SERIAL NOT NULL,
    "odontogram_id" INTEGER NOT NULL,
    "tooth_position_id" INTEGER NOT NULL,
    "tooth_surface_id" INTEGER,
    "dental_procedure_id" INTEGER NOT NULL,
    "treatment_status_id" INTEGER NOT NULL,
    "diagnosis_option_id" INTEGER,
    "findings" TEXT,
    "notes" TEXT,
    "treatment_date" DATE,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "odontogram_treatments_pkey" PRIMARY KEY ("odontogram_treatment_id")
);

-- CreateTable
CREATE TABLE "odontograms" (
    "odontogram_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "consultation_id" INTEGER,
    "odontogram_date" DATE NOT NULL,
    "odontogram_type" VARCHAR(50) DEFAULT 'adult',
    "version" INTEGER DEFAULT 1,
    "is_current_version" BOOLEAN DEFAULT true,
    "conditions" JSONB DEFAULT '[]',
    "general_observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "odontograms_pkey" PRIMARY KEY ("odontogram_id")
);

-- CreateTable
CREATE TABLE "patient_contracts" (
    "patient_contract_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "contract_number" VARCHAR(50),
    "contract_type" VARCHAR(100) NOT NULL,
    "contract_date" DATE NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "contract_amount" DECIMAL(10,2),
    "payment_terms" TEXT,
    "contract_content" TEXT,
    "contract_file_url" TEXT,
    "is_signed" BOOLEAN DEFAULT false,
    "signed_date" DATE,
    "signature_data" TEXT,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "patient_contracts_pkey" PRIMARY KEY ("patient_contract_id")
);

-- CreateTable
CREATE TABLE "patient_documents" (
    "document_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "document_type_id" INTEGER,
    "document_name" VARCHAR(200) NOT NULL,
    "document_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_by" INTEGER,
    "upload_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "patients" (
    "patient_id" SERIAL NOT NULL,
    "branch_id" INTEGER,
    "company_id" INTEGER,
    "identification_type_id" INTEGER,
    "identification_number" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender_id" INTEGER,
    "blood_type_id" INTEGER,
    "marital_status_id" INTEGER,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) DEFAULT 'Colombia',
    "postal_code" VARCHAR(20),
    "emergency_contact_name" VARCHAR(200),
    "emergency_contact_phone" VARCHAR(20),
    "emergency_contact_relationship" VARCHAR(100),
    "photo_url" TEXT,
    "occupation" VARCHAR(100),
    "notes" TEXT,
    "is_basic_registration" BOOLEAN DEFAULT true,
    "completed_at" TIMESTAMPTZ(6),
    "medical_record_number" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "user_id" INTEGER,
    "is_new_client" BOOLEAN DEFAULT true,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "payment_method_id" SERIAL NOT NULL,
    "method_name" VARCHAR(50) NOT NULL,
    "method_code" VARCHAR(20),
    "requires_reference" BOOLEAN DEFAULT false,
    "is_electronic" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("payment_method_id")
);

-- CreateTable
CREATE TABLE "payment_vouchers" (
    "payment_voucher_id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "voucher_number" VARCHAR(50),
    "voucher_date" DATE NOT NULL,
    "voucher_type" VARCHAR(50),
    "voucher_file_url" TEXT,
    "issued_by" INTEGER,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("payment_voucher_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "budget_id" INTEGER,
    "appointment_id" INTEGER,
    "consultation_id" INTEGER,
    "payment_method_id" INTEGER NOT NULL,
    "payment_number" VARCHAR(50),
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference_number" VARCHAR(100),
    "transaction_id" VARCHAR(100),
    "notes" TEXT,
    "received_by" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "income_payments" (
    "income_payment_id" SERIAL NOT NULL,
    "procedure_income_id" INTEGER NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "amount_applied" DECIMAL(10,2) NOT NULL,
    "applied_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "applied_by_user_id" INTEGER,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_payments_pkey" PRIMARY KEY ("income_payment_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" SERIAL NOT NULL,
    "permission_name" VARCHAR(100) NOT NULL,
    "permission_description" TEXT,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "prescription_durations" (
    "prescription_duration_id" SERIAL NOT NULL,
    "duration_name" VARCHAR(100) NOT NULL,
    "duration_code" VARCHAR(20),
    "days" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "prescription_durations_pkey" PRIMARY KEY ("prescription_duration_id")
);

-- CreateTable
CREATE TABLE "prescription_frequencies" (
    "prescription_frequency_id" SERIAL NOT NULL,
    "frequency_name" VARCHAR(100) NOT NULL,
    "frequency_code" VARCHAR(20),
    "hours_interval" INTEGER,
    "times_per_day" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "prescription_frequencies_pkey" PRIMARY KEY ("prescription_frequency_id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "prescription_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "prescription_date" DATE NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "signature" TEXT,
    "consultation_id" INTEGER,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "promotion_id" SERIAL NOT NULL,
    "branch_id" INTEGER,
    "promotion_name" VARCHAR(200) NOT NULL,
    "promotion_code" VARCHAR(50),
    "promotion_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_purchase_amount" DECIMAL(10,2),
    "max_discount_amount" DECIMAL(10,2),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "max_uses" INTEGER,
    "current_uses" INTEGER DEFAULT 0,
    "applicable_procedures" JSONB,
    "terms_and_conditions" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "is_stackable" BOOLEAN DEFAULT false,
    "max_uses_per_patient" INTEGER,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("promotion_id")
);

-- CreateTable
CREATE TABLE "prosthesis_orders" (
    "prosthesis_order_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "consultation_id" INTEGER,
    "order_date" DATE NOT NULL,
    "prosthesis_type" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "laboratory_name" VARCHAR(200),
    "tooth_positions" VARCHAR(200),
    "material" VARCHAR(100),
    "color_shade" VARCHAR(50),
    "order_status" VARCHAR(50) DEFAULT 'ordered',
    "expected_date" DATE,
    "received_date" DATE,
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "prosthesis_orders_pkey" PRIMARY KEY ("prosthesis_order_id")
);

-- CreateTable
CREATE TABLE "public_form_submissions" (
    "submission_id" SERIAL NOT NULL,
    "public_form_id" INTEGER NOT NULL,
    "submission_data" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "submitter_ip" VARCHAR(50),
    "submitter_email" VARCHAR(100),
    "submission_status" VARCHAR(50) DEFAULT 'pending',
    "processed_by" INTEGER,
    "processed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "public_form_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateTable
CREATE TABLE "public_forms" (
    "public_form_id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "form_name" VARCHAR(200) NOT NULL,
    "form_code" VARCHAR(50),
    "form_description" TEXT,
    "form_type" VARCHAR(50) NOT NULL,
    "form_config" JSONB NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "require_authentication" BOOLEAN DEFAULT false,
    "success_message" TEXT,
    "redirect_url" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "public_forms_pkey" PRIMARY KEY ("public_form_id")
);

-- CreateTable
CREATE TABLE "radiography_requests" (
    "radiography_request_id" SERIAL NOT NULL,
    "patient_id" INTEGER,
    "dentist_id" INTEGER,
    "branch_id" INTEGER,
    "consultation_id" INTEGER,
    "request_date" DATE NOT NULL,
    "radiography_type" VARCHAR(100) NOT NULL,
    "area_of_interest" VARCHAR(200),
    "clinical_indication" TEXT,
    "urgency" VARCHAR(20) DEFAULT 'normal',
    "request_status" VARCHAR(50) DEFAULT 'pending',
    "performed_date" DATE,
    "performed_by" INTEGER,
    "image_url" TEXT,
    "findings" TEXT,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "request_data" JSONB,
    "pricing_data" JSONB,

    CONSTRAINT "radiography_requests_pkey" PRIMARY KEY ("radiography_request_id")
);

-- CreateTable
CREATE TABLE "radiography_results" (
    "result_id" SERIAL NOT NULL,
    "radiography_request_id" INTEGER NOT NULL,
    "result_type" VARCHAR(20) NOT NULL,
    "file_name" VARCHAR(255),
    "original_name" VARCHAR(255),
    "file_path" VARCHAR(500),
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "external_url" VARCHAR(1000),
    "uploaded_by" INTEGER,
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) DEFAULT 'active',

    CONSTRAINT "radiography_results_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable
CREATE TABLE "reminder_types" (
    "reminder_type_id" SERIAL NOT NULL,
    "type_name" VARCHAR(50) NOT NULL,
    "type_code" VARCHAR(20),
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "reminder_types_pkey" PRIMARY KEY ("reminder_type_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "role_description" TEXT,
    "role_level" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "roles_permissions" (
    "role_permission_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("role_permission_id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "exception_id" SERIAL NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "exception_date" DATE NOT NULL,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "is_available" BOOLEAN DEFAULT false,
    "reason" VARCHAR(200),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("exception_id")
);

-- CreateTable
CREATE TABLE "signed_consents" (
    "signed_consent_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "consent_template_id" INTEGER NOT NULL,
    "consultation_id" INTEGER,
    "appointment_id" INTEGER,
    "consent_date" DATE NOT NULL,
    "consent_content" TEXT NOT NULL,
    "signature_data" TEXT,
    "signed_by" VARCHAR(200),
    "witness_name" VARCHAR(200),
    "witness_signature_data" TEXT,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "signed_consents_pkey" PRIMARY KEY ("signed_consent_id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "specialty_id" SERIAL NOT NULL,
    "specialty_name" VARCHAR(100) NOT NULL,
    "specialty_description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("specialty_id")
);

-- CreateTable
CREATE TABLE "tooth_positions" (
    "tooth_position_id" SERIAL NOT NULL,
    "tooth_number" VARCHAR(10) NOT NULL,
    "tooth_name" VARCHAR(100),
    "quadrant" INTEGER,
    "tooth_type" VARCHAR(50),
    "is_adult" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "tooth_positions_pkey" PRIMARY KEY ("tooth_position_id")
);

-- CreateTable
CREATE TABLE "tooth_surfaces" (
    "tooth_surface_id" SERIAL NOT NULL,
    "surface_code" VARCHAR(10) NOT NULL,
    "surface_name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "tooth_surfaces_pkey" PRIMARY KEY ("tooth_surface_id")
);

-- CreateTable
CREATE TABLE "treatment_notes" (
    "note_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "note_date" DATE NOT NULL,
    "chief_complaint" TEXT,
    "clinical_findings" TEXT,
    "diagnosis" TEXT,
    "treatment_provided" TEXT,
    "recommendations" TEXT,
    "next_visit_notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_notes_pkey" PRIMARY KEY ("note_id")
);

-- CreateTable
CREATE TABLE "treatment_plan_procedures" (
    "plan_procedure_id" SERIAL NOT NULL,
    "treatment_plan_id" INTEGER NOT NULL,
    "dental_procedure_id" INTEGER NOT NULL,
    "tooth_position_id" INTEGER,
    "tooth_surface_id" INTEGER,
    "procedure_order" INTEGER,
    "estimated_cost" DECIMAL(10,2),
    "actual_cost" DECIMAL(10,2),
    "is_completed" BOOLEAN DEFAULT false,
    "completed_date" DATE,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_plan_procedures_pkey" PRIMARY KEY ("plan_procedure_id")
);

-- CreateTable
CREATE TABLE "treatment_plan_statuses" (
    "treatment_plan_status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(20),
    "status_color" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_plan_statuses_pkey" PRIMARY KEY ("treatment_plan_status_id")
);

-- CreateTable
CREATE TABLE "treatment_plans" (
    "treatment_plan_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "treatment_plan_status_id" INTEGER NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "plan_date" DATE NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "total_estimated_cost" DECIMAL(10,2),
    "description" TEXT,
    "notes" TEXT,
    "approved_by_patient" BOOLEAN DEFAULT false,
    "approved_date" DATE,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_plans_pkey" PRIMARY KEY ("treatment_plan_id")
);

-- CreateTable
CREATE TABLE "treatment_statuses" (
    "treatment_status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(20),
    "status_color" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_statuses_pkey" PRIMARY KEY ("treatment_status_id")
);

-- CreateTable
CREATE TABLE "treatments" (
    "treatment_id" SERIAL NOT NULL,
    "treatment_code" VARCHAR(50),
    "treatment_name" VARCHAR(200) NOT NULL,
    "treatment_category" VARCHAR(100),
    "description" TEXT,
    "base_price" DECIMAL(10,2),
    "estimated_duration" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "total_price" DECIMAL(10,2) DEFAULT 0.00,
    "pack_type" VARCHAR(20) DEFAULT 'simple',
    "is_pack" BOOLEAN DEFAULT false,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("treatment_id")
);

-- CreateTable
CREATE TABLE "user_statuses" (
    "user_status_id" SERIAL NOT NULL,
    "status_name" VARCHAR(50) NOT NULL,
    "status_code" VARCHAR(20),
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "user_statuses_pkey" PRIMARY KEY ("user_status_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "mobile" VARCHAR(20),
    "avatar_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "email_verified" BOOLEAN DEFAULT false,
    "last_login" TIMESTAMPTZ(6),
    "failed_login_attempts" INTEGER DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "password_changed_at" TIMESTAMPTZ(6),
    "must_change_password" BOOLEAN DEFAULT false,
    "profile" JSONB DEFAULT '{}',
    "branches_access" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "commission_percentage" DECIMAL(5,2) DEFAULT 50.00,
    "commission_config" JSONB,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "prescription_item_id" SERIAL NOT NULL,
    "prescription_id" INTEGER NOT NULL,
    "medication_id" INTEGER,
    "medication_name" VARCHAR(200) NOT NULL,
    "concentration" VARCHAR(100),
    "quantity" VARCHAR(100) NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("prescription_item_id")
);

-- CreateTable
CREATE TABLE "auxiliary_exam_results" (
    "auxiliary_exam_result_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "doctor_observations" TEXT,
    "external_files" JSONB DEFAULT '[]',
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "auxiliary_exam_results_pkey" PRIMARY KEY ("auxiliary_exam_result_id")
);

-- CreateTable
CREATE TABLE "definitive_diagnosis_conditions" (
    "definitive_condition_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "presumptive_condition_id" INTEGER,
    "tooth_position_id" INTEGER NOT NULL,
    "tooth_number" VARCHAR(10) NOT NULL,
    "dental_condition_id" INTEGER NOT NULL,
    "condition_label" VARCHAR(200) NOT NULL,
    "cie10_code" VARCHAR(10),
    "surfaces" JSONB DEFAULT '[]',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "is_modified_from_presumptive" BOOLEAN DEFAULT false,
    "modification_reason" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "tooth_surface_id" INTEGER,
    "odontogram_condition_id" INTEGER,
    "selected_procedure_id" INTEGER,
    "procedure_price" DECIMAL(10,2),

    CONSTRAINT "definitive_diagnosis_conditions_pkey" PRIMARY KEY ("definitive_condition_id")
);

-- CreateTable
CREATE TABLE "definitive_diagnosis_condition_surfaces" (
    "id" SERIAL NOT NULL,
    "definitive_condition_id" INTEGER NOT NULL,
    "tooth_surface_id" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "definitive_diagnosis_condition_surfaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_condition_items" (
    "item_id" SERIAL NOT NULL,
    "treatment_id" INTEGER NOT NULL,
    "odontogram_condition_id" INTEGER NOT NULL,
    "condition_procedure_id" INTEGER,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0.00,
    "discount_amount" DECIMAL(10,2) DEFAULT 0.00,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_condition_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "treatment_custom_items" (
    "custom_item_id" SERIAL NOT NULL,
    "treatment_id" INTEGER NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "item_description" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0.00,
    "discount_amount" DECIMAL(10,2) DEFAULT 0.00,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "item_category" VARCHAR(100),
    "notes" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "treatment_custom_items_pkey" PRIMARY KEY ("custom_item_id")
);

-- CreateTable
CREATE TABLE "implant_plans" (
    "implant_plan_id" SERIAL NOT NULL,
    "plan_type" VARCHAR(50) NOT NULL,
    "monto_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "inicial" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "mensual" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "implant_plans_pkey" PRIMARY KEY ("implant_plan_id")
);

-- CreateTable
CREATE TABLE "orthodontic_plans" (
    "orthodontic_plan_id" SERIAL NOT NULL,
    "plan_type" VARCHAR(50) NOT NULL,
    "plan_modality" VARCHAR(50) NOT NULL,
    "monto_total" DECIMAL(10,2) DEFAULT 0.00,
    "inicial" DECIMAL(10,2) DEFAULT 0.00,
    "pago_mensual" DECIMAL(10,2) DEFAULT 0.00,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "orthodontic_plans_pkey" PRIMARY KEY ("orthodontic_plan_id")
);

-- CreateTable
CREATE TABLE "prosthesis_items" (
    "prosthesis_item_id" SERIAL NOT NULL,
    "item_number" INTEGER NOT NULL,
    "treatment_projection" VARCHAR(200) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "prosthesis_items_pkey" PRIMARY KEY ("prosthesis_item_id")
);

-- CreateTable
CREATE TABLE "consultation_additional_services" (
    "consultation_additional_service_id" SERIAL NOT NULL,
    "consultation_treatment_plan_id" INTEGER NOT NULL,
    "service_type" VARCHAR(20) NOT NULL,
    "orthodontic_plan_id" INTEGER,
    "implant_plan_id" INTEGER,
    "prosthesis_item_id" INTEGER,
    "service_name" VARCHAR(200) NOT NULL,
    "modality" VARCHAR(50),
    "description" TEXT,
    "original_monto_total" DECIMAL(10,2) DEFAULT 0.00,
    "original_inicial" DECIMAL(10,2) DEFAULT 0.00,
    "original_mensual" DECIMAL(10,2) DEFAULT 0.00,
    "edited_monto_total" DECIMAL(10,2) DEFAULT 0.00,
    "edited_inicial" DECIMAL(10,2) DEFAULT 0.00,
    "edited_mensual" DECIMAL(10,2) DEFAULT 0.00,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "initial_payment_completed" BOOLEAN DEFAULT false,
    "initial_payment_date" DATE,
    "initial_payment_income_id" INTEGER,
    "monthly_payments_count" INTEGER DEFAULT 0,
    "service_status" VARCHAR(20) DEFAULT 'pending',
    "service_completed_date" DATE,
    "service_completed_by_dentist_id" INTEGER,
    "final_payment_notes" TEXT,
    "completion_income_id" INTEGER,

    CONSTRAINT "consultation_additional_services_pkey" PRIMARY KEY ("consultation_additional_service_id")
);

-- CreateTable
CREATE TABLE "consultation_treatment_item_conditions" (
    "condition_id" SERIAL NOT NULL,
    "consultation_treatment_item_id" INTEGER NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "price" DECIMAL(10,2) DEFAULT 0.00,
    "quantity" INTEGER DEFAULT 1,
    "subtotal" DECIMAL(10,2),
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "definitive_condition_id" INTEGER,

    CONSTRAINT "consultation_treatment_item_conditions_pkey" PRIMARY KEY ("condition_id")
);

-- CreateTable
CREATE TABLE "consultation_treatment_items" (
    "consultation_treatment_item_id" SERIAL NOT NULL,
    "consultation_treatment_plan_id" INTEGER NOT NULL,
    "treatment_id" INTEGER,
    "treatment_name" VARCHAR(200) NOT NULL,
    "total_amount" DECIMAL(10,2) DEFAULT 0.00,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "consultation_treatment_items_pkey" PRIMARY KEY ("consultation_treatment_item_id")
);

-- CreateTable
CREATE TABLE "consultation_treatment_plans" (
    "consultation_treatment_plan_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "treatment_plan_id" INTEGER,
    "plan_name" VARCHAR(200),
    "definitive_diagnosis_total" DECIMAL(10,2) DEFAULT 0.00,
    "treatments_total" DECIMAL(10,2) DEFAULT 0.00,
    "additional_services_total" DECIMAL(10,2) DEFAULT 0.00,
    "grand_total" DECIMAL(10,2) DEFAULT 0.00,
    "has_initial_payment" BOOLEAN DEFAULT true,
    "initial_payment" DECIMAL(10,2) DEFAULT 0.00,
    "monthly_payment" DECIMAL(10,2) DEFAULT 0.00,
    "observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "consultation_treatment_plans_pkey" PRIMARY KEY ("consultation_treatment_plan_id")
);

-- CreateTable
CREATE TABLE "consultation_budgets" (
    "consultation_budget_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "definitive_diagnosis_total" DECIMAL(10,2) DEFAULT 0.00,
    "treatments_total" DECIMAL(10,2) DEFAULT 0.00,
    "additional_services_total" DECIMAL(10,2) DEFAULT 0.00,
    "exams_total" DECIMAL(10,2) DEFAULT 0.00,
    "grand_total" DECIMAL(10,2) DEFAULT 0.00,
    "advance_payment" DECIMAL(10,2) DEFAULT 0.00,
    "balance" DECIMAL(10,2) DEFAULT 0.00,
    "observations" TEXT,
    "status" VARCHAR(20) DEFAULT 'draft',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "subtotal" DECIMAL(10,2) DEFAULT 0.00,
    "promotion_id" INTEGER,
    "discount_type" VARCHAR(20),
    "discount_value" DECIMAL(10,2) DEFAULT 0.00,
    "discount_amount" DECIMAL(10,2) DEFAULT 0.00,

    CONSTRAINT "consultation_budgets_pkey" PRIMARY KEY ("consultation_budget_id")
);

-- CreateTable
CREATE TABLE "evolution_odontogram" (
    "evolution_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "procedure_history_id" INTEGER,
    "income_id" INTEGER,
    "tooth_position_id" INTEGER NOT NULL,
    "tooth_surface_id" INTEGER,
    "condition_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "original_condition_id" INTEGER,
    "original_condition_name" VARCHAR(200),
    "registered_by_dentist_id" INTEGER NOT NULL,
    "registered_date" DATE NOT NULL,
    "clinical_observation" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "evolution_odontogram_pkey" PRIMARY KEY ("evolution_id")
);

-- CreateTable
CREATE TABLE "procedure_history" (
    "procedure_history_id" SERIAL NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "tooth_position_id" INTEGER,
    "tooth_surface_id" INTEGER,
    "procedure_name" VARCHAR(200) NOT NULL,
    "procedure_code" VARCHAR(50),
    "procedure_type" VARCHAR(50),
    "procedure_status" VARCHAR(20) DEFAULT 'completed',
    "procedure_result" VARCHAR(50),
    "performed_by_dentist_id" INTEGER NOT NULL,
    "performed_date" DATE NOT NULL,
    "performed_time" TIME(6),
    "clinical_notes" TEXT,
    "complications" TEXT,
    "next_steps" TEXT,
    "treatment_plan_item_id" INTEGER,
    "additional_service_id" INTEGER,
    "odontogram_condition_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "definitive_condition_id" INTEGER,

    CONSTRAINT "procedure_history_pkey" PRIMARY KEY ("procedure_history_id")
);

-- CreateTable
CREATE TABLE "procedure_income" (
    "income_id" SERIAL NOT NULL,
    "procedure_history_id" INTEGER,
    "consultation_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "income_type" VARCHAR(30) NOT NULL,
    "treatment_plan_item_id" INTEGER,
    "additional_service_id" INTEGER,
    "item_name" VARCHAR(200) NOT NULL,
    "item_description" TEXT,
    "tooth_position_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'PEN',
    "performed_by_dentist_id" INTEGER NOT NULL,
    "performed_date" DATE NOT NULL,
    "performed_time" TIME(6),
    "clinical_notes" TEXT,
    "income_status" VARCHAR(20) DEFAULT 'confirmed',
    "payment_id" INTEGER,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),
    "quota_number" INTEGER,
    "is_final_quota" BOOLEAN DEFAULT false,
    "treatment_plan_total" DECIMAL(10,2),
    "appointment_id" INTEGER,
    "quota_type" VARCHAR(20),
    "parent_additional_service_id" INTEGER,
    "commission_id" INTEGER,
    "payment_status" VARCHAR(20) DEFAULT 'pending',
    "amount_paid" DECIMAL(10,2) DEFAULT 0,
    "balance" DECIMAL(10,2),
    "due_date" DATE,
    "patient_notified_at" TIMESTAMPTZ(6),
    "voucher_url" VARCHAR(500),
    "voucher_submitted_at" TIMESTAMPTZ(6),
    "voucher_payment_method_id" INTEGER,
    "verified_by_user_id" INTEGER,
    "verified_at" TIMESTAMPTZ(6),
    "rejection_reason" VARCHAR(500),

    CONSTRAINT "procedure_income_pkey" PRIMARY KEY ("income_id")
);

-- CreateTable
CREATE TABLE "dentist_commissions" (
    "commission_id" SERIAL NOT NULL,
    "dentist_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "gross_income" DECIMAL(12,2) NOT NULL,
    "igv_amount" DECIMAL(12,2) DEFAULT 0,
    "prosthesis_lab_cost" DECIMAL(12,2) DEFAULT 0,
    "materials_cost" DECIMAL(12,2) DEFAULT 0,
    "other_deductions" DECIMAL(12,2) DEFAULT 0,
    "net_base" DECIMAL(12,2) NOT NULL,
    "commission_percentage" DECIMAL(5,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "income_count" INTEGER DEFAULT 0,
    "commission_status" VARCHAR(20) DEFAULT 'pending',
    "calculated_by" INTEGER,
    "calculated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ(6),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "paid_by" INTEGER,
    "paid_at" TIMESTAMPTZ(6),
    "payment_method" VARCHAR(50),
    "payment_reference" VARCHAR(100),
    "payment_notes" TEXT,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "dentist_commissions_pkey" PRIMARY KEY ("commission_id")
);

-- CreateTable
CREATE TABLE "service_monthly_payments" (
    "payment_id" SERIAL NOT NULL,
    "consultation_additional_service_id" INTEGER NOT NULL,
    "consultation_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "payment_number" INTEGER NOT NULL,
    "payment_amount" DECIMAL(10,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_type" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "registered_by_dentist_id" INTEGER NOT NULL,
    "income_id" INTEGER,
    "clinical_notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "service_monthly_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "health_plan_dependents" (
    "dependent_id" SERIAL NOT NULL,
    "subscription_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "relationship_description" VARCHAR(200),
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "health_plan_dependents_pkey" PRIMARY KEY ("dependent_id")
);

-- CreateTable
CREATE TABLE "sub_procedures" (
    "sub_procedure_id" SERIAL NOT NULL,
    "sub_procedure_code" VARCHAR(50),
    "sub_procedure_name" VARCHAR(200) NOT NULL,
    "specialty" VARCHAR(100),
    "description" TEXT,
    "odontogram_condition_code" VARCHAR(50),
    "price_without_plan" DECIMAL(10,2) NOT NULL,
    "price_plan_personal" DECIMAL(10,2),
    "price_plan_familiar" DECIMAL(10,2),
    "price_plan_platinium" DECIMAL(10,2),
    "price_plan_oro" DECIMAL(10,2),
    "estimated_duration" INTEGER DEFAULT 30,
    "requires_anesthesia" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "sub_procedures_pkey" PRIMARY KEY ("sub_procedure_id")
);

-- CreateTable
CREATE TABLE "benefit_settings" (
    "benefit_setting_id" SERIAL NOT NULL,
    "benefit_code" VARCHAR(50) NOT NULL,
    "benefit_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price_without_plan" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price_plan_personal" DECIMAL(10,2),
    "price_plan_familiar" DECIMAL(10,2),
    "price_plan_platinium" DECIMAL(10,2),
    "price_plan_oro" DECIMAL(10,2),
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "benefit_settings_pkey" PRIMARY KEY ("benefit_setting_id")
);

-- CreateTable
CREATE TABLE "treatment_sub_procedure_items" (
    "item_id" SERIAL NOT NULL,
    "treatment_id" INTEGER NOT NULL,
    "sub_procedure_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_percentage" DECIMAL(5,2) DEFAULT 0,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "subtotal" DECIMAL(10,2) DEFAULT 0,
    "notes" TEXT,
    "display_order" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "treatment_sub_procedure_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "branch_payment_methods" (
    "payment_method_id" SERIAL NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "method_type" VARCHAR(50) NOT NULL,
    "method_name" VARCHAR(100) NOT NULL,
    "bank_name" VARCHAR(100),
    "account_number" VARCHAR(50),
    "account_holder" VARCHAR(200),
    "phone_number" VARCHAR(20),
    "additional_info" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "branch_payment_methods_pkey" PRIMARY KEY ("payment_method_id")
);

-- CreateTable
CREATE TABLE "laboratory_external_payments" (
    "payment_id" SERIAL NOT NULL,
    "radiography_request_id" INTEGER NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "final_price" DECIMAL(10,2) NOT NULL,
    "payment_status" VARCHAR(20) DEFAULT 'pending',
    "paid_at" TIMESTAMP(6),
    "paid_by_user_id" INTEGER,
    "set_price_by_user_id" INTEGER,
    "set_price_at" TIMESTAMP(6),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMP(6),

    CONSTRAINT "laboratory_external_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "patient_external_exams" (
    "external_exam_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "exam_type" VARCHAR(20) NOT NULL,
    "file_name" VARCHAR(255),
    "original_name" VARCHAR(255),
    "file_path" TEXT,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "external_url" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "patient_external_exams_pkey" PRIMARY KEY ("external_exam_id")
);

-- CreateTable
CREATE TABLE "promotion_purchases" (
    "purchase_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "promotion_id" INTEGER NOT NULL,
    "purchase_status" VARCHAR(30) DEFAULT 'pending',
    "payment_method_id" INTEGER,
    "payment_proof_url" VARCHAR(500),
    "payment_amount" DECIMAL(10,2),
    "payment_date" TIMESTAMPTZ(6),
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "used_at" TIMESTAMPTZ(6),
    "appointment_id" INTEGER,
    "discount_applied" DECIMAL(10,2),
    "purchase_code" VARCHAR(20),
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "user_id_registration" INTEGER,
    "date_time_registration" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id_modification" INTEGER,
    "date_time_modification" TIMESTAMPTZ(6),

    CONSTRAINT "promotion_purchases_pkey" PRIMARY KEY ("purchase_id")
);

-- CreateTable
CREATE TABLE "promotion_usages" (
    "usage_id" SERIAL NOT NULL,
    "promotion_id" INTEGER NOT NULL,
    "patient_id" INTEGER,
    "budget_id" INTEGER,
    "consultation_budget_id" INTEGER,
    "applied_discount" DECIMAL(10,2) NOT NULL,
    "original_amount" DECIMAL(10,2),
    "final_amount" DECIMAL(10,2),
    "procedures_affected" JSONB,
    "used_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "used_by_user_id" INTEGER,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',

    CONSTRAINT "promotion_usages_pkey" PRIMARY KEY ("usage_id")
);

-- CreateIndex
CREATE INDEX "idx_app_settings_branch" ON "app_settings"("branch_id");

-- CreateIndex
CREATE INDEX "idx_app_settings_key" ON "app_settings"("setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "uk_app_setting_key" ON "app_settings"("branch_id", "setting_key");

-- CreateIndex
CREATE INDEX "idx_appointment_reminders_appointment" ON "appointment_reminders"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_appointment_reminders_scheduled" ON "appointment_reminders"("scheduled_for");

-- CreateIndex
CREATE INDEX "idx_appointment_reminders_status" ON "appointment_reminders"("delivery_status");

-- CreateIndex
CREATE INDEX "idx_reschedule_appointment" ON "appointment_reschedules"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_reschedule_created" ON "appointment_reschedules"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_reschedule_status" ON "appointment_reschedules"("status");

-- CreateIndex
CREATE INDEX "idx_history_appointment" ON "appointment_status_history"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_history_changed_at" ON "appointment_status_history"("changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_history_new_status" ON "appointment_status_history"("new_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_statuses_status_name_key" ON "appointment_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_statuses_status_code_key" ON "appointment_statuses"("status_code");

-- CreateIndex
CREATE INDEX "idx_appointments_branch" ON "appointments"("branch_id");

-- CreateIndex
CREATE INDEX "idx_appointments_date" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "idx_appointments_datetime" ON "appointments"("appointment_date", "start_time");

-- CreateIndex
CREATE INDEX "idx_appointments_dentist" ON "appointments"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_appointments_patient" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_appointments_specialty" ON "appointments"("specialty_id");

-- CreateIndex
CREATE INDEX "idx_appointments_status" ON "appointments"("appointment_status_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_record" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_table" ON "audit_logs"("table_name");

-- CreateIndex
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blood_types_blood_type_name_key" ON "blood_types"("blood_type_name");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_code_key" ON "branches"("branch_code");

-- CreateIndex
CREATE INDEX "idx_branches_administrator" ON "branches"("administrator_id");

-- CreateIndex
CREATE INDEX "idx_branches_company" ON "branches"("company_id");

-- CreateIndex
CREATE INDEX "idx_branches_department" ON "branches"("department");

-- CreateIndex
CREATE INDEX "idx_branches_manager_name" ON "branches"("manager_name");

-- CreateIndex
CREATE INDEX "idx_branches_status" ON "branches"("status");

-- CreateIndex
CREATE INDEX "idx_budget_details_budget" ON "budget_details"("budget_id");

-- CreateIndex
CREATE INDEX "idx_budget_details_procedure" ON "budget_details"("dental_procedure_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_statuses_status_name_key" ON "budget_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "budget_statuses_status_code_key" ON "budget_statuses"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_budget_number_key" ON "budgets"("budget_number");

-- CreateIndex
CREATE INDEX "idx_budgets_date" ON "budgets"("budget_date");

-- CreateIndex
CREATE INDEX "idx_budgets_dentist" ON "budgets"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_budgets_number" ON "budgets"("budget_number");

-- CreateIndex
CREATE INDEX "idx_budgets_patient" ON "budgets"("patient_id");

-- CreateIndex
CREATE INDEX "idx_budgets_status" ON "budgets"("budget_status_id");

-- CreateIndex
CREATE INDEX "idx_budgets_treatment_plan" ON "budgets"("treatment_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_ruc_key" ON "companies"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "company_contracts_contract_number_key" ON "company_contracts"("contract_number");

-- CreateIndex
CREATE INDEX "idx_company_contracts_branch" ON "company_contracts"("branch_id");

-- CreateIndex
CREATE INDEX "idx_company_contracts_company" ON "company_contracts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "consent_templates_template_code_key" ON "consent_templates"("template_code");

-- CreateIndex
CREATE INDEX "idx_consent_templates_code" ON "consent_templates"("template_code");

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_template_code_key" ON "contract_templates"("template_code");

-- CreateIndex
CREATE INDEX "idx_contract_templates_type" ON "contract_templates"("template_type");

-- CreateIndex
CREATE INDEX "idx_contract_templates_category" ON "contract_templates"("template_category");

-- CreateIndex
CREATE INDEX "idx_contract_templates_status" ON "contract_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_rooms_room_code_key" ON "consultation_rooms"("room_code");

-- CreateIndex
CREATE INDEX "idx_consultation_rooms_branch" ON "consultation_rooms"("branch_id");

-- CreateIndex
CREATE INDEX "idx_consultation_rooms_code" ON "consultation_rooms"("room_code");

-- CreateIndex
CREATE INDEX "idx_consultations_appointment" ON "consultations"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_consultations_branch" ON "consultations"("branch_id");

-- CreateIndex
CREATE INDEX "idx_consultations_date" ON "consultations"("consultation_date");

-- CreateIndex
CREATE INDEX "idx_consultations_dentist" ON "consultations"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_consultations_patient" ON "consultations"("patient_id");

-- CreateIndex
CREATE INDEX "idx_consultations_extraoral_images" ON "consultations" USING GIN ("extraoral_exam_images");

-- CreateIndex
CREATE INDEX "idx_consultations_intraoral_images" ON "consultations" USING GIN ("intraoral_exam_images");

-- CreateIndex
CREATE UNIQUE INDEX "dental_procedures_procedure_code_key" ON "dental_procedures"("procedure_code");

-- CreateIndex
CREATE INDEX "idx_dentist_schedules_branch" ON "dentist_schedules"("branch_id");

-- CreateIndex
CREATE INDEX "idx_dentist_schedules_day" ON "dentist_schedules"("day_of_week");

-- CreateIndex
CREATE INDEX "idx_dentist_schedules_dentist" ON "dentist_schedules"("dentist_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_dentist_schedule" ON "dentist_schedules"("dentist_id", "branch_id", "day_of_week", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "dentist_specialties_dentist_id_specialty_id_key" ON "dentist_specialties"("dentist_id", "specialty_id");

-- CreateIndex
CREATE UNIQUE INDEX "dentists_user_id_key" ON "dentists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dentists_professional_license_key" ON "dentists"("professional_license");

-- CreateIndex
CREATE INDEX "idx_dentists_specialty" ON "dentists"("specialty_id");

-- CreateIndex
CREATE INDEX "idx_dentists_status" ON "dentists"("status");

-- CreateIndex
CREATE INDEX "idx_dentists_user" ON "dentists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosis_options_diagnosis_code_key" ON "diagnosis_options"("diagnosis_code");

-- CreateIndex
CREATE INDEX "idx_diagnostic_conditions_consultation" ON "diagnostic_conditions"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_diagnostic_conditions_diagnosis" ON "diagnostic_conditions"("diagnosis_option_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_type_name_key" ON "document_types"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_type_code_key" ON "document_types"("type_code");

-- CreateIndex
CREATE UNIQUE INDEX "genders_gender_name_key" ON "genders"("gender_name");

-- CreateIndex
CREATE UNIQUE INDEX "genders_gender_code_key" ON "genders"("gender_code");

-- CreateIndex
CREATE INDEX "idx_health_plan_settings_plan" ON "health_plan_settings"("health_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_health_plan_setting" ON "health_plan_settings"("health_plan_id", "setting_key");

-- CreateIndex
CREATE UNIQUE INDEX "health_plan_subscriptions_subscription_number_key" ON "health_plan_subscriptions"("subscription_number");

-- CreateIndex
CREATE INDEX "idx_health_plan_subscriptions_patient" ON "health_plan_subscriptions"("patient_id");

-- CreateIndex
CREATE INDEX "idx_health_plan_subscriptions_plan" ON "health_plan_subscriptions"("health_plan_id");

-- CreateIndex
CREATE INDEX "idx_health_plan_subscriptions_approval_status" ON "health_plan_subscriptions"("approval_status");

-- CreateIndex
CREATE INDEX "idx_health_plan_subscriptions_approved_by" ON "health_plan_subscriptions"("approved_by");

-- CreateIndex
CREATE INDEX "idx_health_plan_subscriptions_first_consultation" ON "health_plan_subscriptions"("first_free_consultation_used");

-- CreateIndex
CREATE INDEX "idx_health_plan_terms_plan" ON "health_plan_terms"("health_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_plans_plan_code_key" ON "health_plans"("plan_code");

-- CreateIndex
CREATE INDEX "idx_health_plans_code" ON "health_plans"("plan_code");

-- CreateIndex
CREATE UNIQUE INDEX "identification_types_type_name_key" ON "identification_types"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "identification_types_type_code_key" ON "identification_types"("type_code");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_categories_category_name_key" ON "inventory_categories"("category_name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_categories_category_code_key" ON "inventory_categories"("category_code");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_item_code_key" ON "inventory_items"("item_code");

-- CreateIndex
CREATE INDEX "idx_inventory_items_branch" ON "inventory_items"("branch_id");

-- CreateIndex
CREATE INDEX "idx_inventory_items_category" ON "inventory_items"("inventory_category_id");

-- CreateIndex
CREATE INDEX "idx_inventory_items_code" ON "inventory_items"("item_code");

-- CreateIndex
CREATE INDEX "idx_lab_results_request" ON "lab_results"("laboratory_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_pricing_pricing_type_key" ON "laboratory_pricing"("pricing_type");

-- CreateIndex
CREATE INDEX "idx_laboratory_pricing_type" ON "laboratory_pricing"("pricing_type");

-- CreateIndex
CREATE INDEX "idx_laboratory_requests_consultation" ON "laboratory_requests"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_laboratory_requests_date" ON "laboratory_requests"("request_date");

-- CreateIndex
CREATE INDEX "idx_laboratory_requests_dentist" ON "laboratory_requests"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_laboratory_requests_patient" ON "laboratory_requests"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_service_prices_service_code_key" ON "laboratory_service_prices"("service_code");

-- CreateIndex
CREATE INDEX "idx_service_prices_active" ON "laboratory_service_prices"("is_active");

-- CreateIndex
CREATE INDEX "idx_service_prices_category" ON "laboratory_service_prices"("service_category");

-- CreateIndex
CREATE INDEX "idx_service_prices_code" ON "laboratory_service_prices"("service_code");

-- CreateIndex
CREATE INDEX "idx_service_prices_legacy" ON "laboratory_service_prices"("legacy_field_name");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_services_service_code_key" ON "laboratory_services"("service_code");

-- CreateIndex
CREATE UNIQUE INDEX "marital_statuses_status_name_key" ON "marital_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "marital_statuses_status_code_key" ON "marital_statuses"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "medical_histories_patient_id_key" ON "medical_histories"("patient_id");

-- CreateIndex
CREATE INDEX "idx_medical_histories_patient" ON "medical_histories"("patient_id");

-- CreateIndex
CREATE INDEX "idx_medical_histories_pathological_background" ON "medical_histories" USING GIN ("pathological_background");

-- CreateIndex
CREATE UNIQUE INDEX "medication_units_unit_name_key" ON "medication_units"("unit_name");

-- CreateIndex
CREATE UNIQUE INDEX "medication_units_unit_abbreviation_key" ON "medication_units"("unit_abbreviation");

-- CreateIndex
CREATE INDEX "idx_notifications_created" ON "notifications"("date_time_registration");

-- CreateIndex
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_patient" ON "notifications"("patient_id");

-- CreateIndex
CREATE INDEX "idx_notifications_type" ON "notifications"("notification_type");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_condition_procedures_condition" ON "odontogram_condition_procedures"("odontogram_condition_id");

-- CreateIndex
CREATE INDEX "idx_condition_procedures_order" ON "odontogram_condition_procedures"("display_order");

-- CreateIndex
CREATE INDEX "idx_condition_procedures_status" ON "odontogram_condition_procedures"("status");

-- CreateIndex
CREATE INDEX "idx_odontogram_conditions_dental_condition" ON "odontogram_conditions"("dental_condition_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_conditions_odontogram" ON "odontogram_conditions"("odontogram_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_conditions_position" ON "odontogram_conditions"("tooth_position_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_conditions_surface" ON "odontogram_conditions"("tooth_surface_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_conditions_tooth_position" ON "odontogram_conditions"("tooth_position_id");

-- CreateIndex
CREATE UNIQUE INDEX "odontogram_dental_conditions_condition_code_key" ON "odontogram_dental_conditions"("condition_code");

-- CreateIndex
CREATE INDEX "idx_odontogram_dental_conditions_category" ON "odontogram_dental_conditions"("category");

-- CreateIndex
CREATE INDEX "idx_odontogram_dental_conditions_code" ON "odontogram_dental_conditions"("condition_code");

-- CreateIndex
CREATE INDEX "idx_odontogram_dental_conditions_status" ON "odontogram_dental_conditions"("status");

-- CreateIndex
CREATE INDEX "idx_odontogram_treatments_odontogram" ON "odontogram_treatments"("odontogram_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_treatments_position" ON "odontogram_treatments"("tooth_position_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_treatments_procedure" ON "odontogram_treatments"("dental_procedure_id");

-- CreateIndex
CREATE INDEX "idx_odontogram_treatments_status" ON "odontogram_treatments"("treatment_status_id");

-- CreateIndex
CREATE INDEX "idx_odontograms_appointment" ON "odontograms"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_odontograms_consultation" ON "odontograms"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_odontograms_current_version" ON "odontograms"("patient_id", "is_current_version");

-- CreateIndex
CREATE INDEX "idx_odontograms_date" ON "odontograms"("odontogram_date");

-- CreateIndex
CREATE INDEX "idx_odontograms_dentist" ON "odontograms"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_odontograms_patient" ON "odontograms"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_contracts_contract_number_key" ON "patient_contracts"("contract_number");

-- CreateIndex
CREATE INDEX "idx_patient_contracts_branch" ON "patient_contracts"("branch_id");

-- CreateIndex
CREATE INDEX "idx_patient_contracts_patient" ON "patient_contracts"("patient_id");

-- CreateIndex
CREATE INDEX "idx_patient_documents_patient" ON "patient_documents"("patient_id");

-- CreateIndex
CREATE INDEX "idx_patient_documents_type" ON "patient_documents"("document_type_id");

-- CreateIndex
CREATE INDEX "idx_patient_documents_upload_date" ON "patient_documents"("upload_date");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_medical_record_number_key" ON "patients"("medical_record_number");

-- CreateIndex
CREATE INDEX "idx_patients_branch" ON "patients"("branch_id");

-- CreateIndex
CREATE INDEX "idx_patients_company" ON "patients"("company_id");

-- CreateIndex
CREATE INDEX "idx_patients_email" ON "patients"("email");

-- CreateIndex
CREATE INDEX "idx_patients_identification" ON "patients"("identification_number");

-- CreateIndex
CREATE INDEX "idx_patients_medical_record" ON "patients"("medical_record_number");

-- CreateIndex
CREATE INDEX "idx_patients_name" ON "patients"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "idx_patients_status" ON "patients"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uk_patient_identification_unique" ON "patients"("identification_type_id", "identification_number");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_method_name_key" ON "payment_methods"("method_name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_method_code_key" ON "payment_methods"("method_code");

-- CreateIndex
CREATE UNIQUE INDEX "payment_vouchers_voucher_number_key" ON "payment_vouchers"("voucher_number");

-- CreateIndex
CREATE INDEX "idx_payment_vouchers_payment" ON "payment_vouchers"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "idx_payments_appointment" ON "payments"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_payments_budget" ON "payments"("budget_id");

-- CreateIndex
CREATE INDEX "idx_payments_consultation" ON "payments"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_payments_date" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "idx_payments_method" ON "payments"("payment_method_id");

-- CreateIndex
CREATE INDEX "idx_payments_number" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "idx_payments_patient" ON "payments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_income_payments_procedure_income" ON "income_payments"("procedure_income_id");

-- CreateIndex
CREATE INDEX "idx_income_payments_payment" ON "income_payments"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_name_key" ON "permissions"("permission_name");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_durations_duration_name_key" ON "prescription_durations"("duration_name");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_durations_duration_code_key" ON "prescription_durations"("duration_code");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_frequencies_frequency_name_key" ON "prescription_frequencies"("frequency_name");

-- CreateIndex
CREATE UNIQUE INDEX "prescription_frequencies_frequency_code_key" ON "prescription_frequencies"("frequency_code");

-- CreateIndex
CREATE INDEX "idx_prescriptions_appointment" ON "prescriptions"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_prescriptions_date" ON "prescriptions"("prescription_date");

-- CreateIndex
CREATE INDEX "idx_prescriptions_dentist" ON "prescriptions"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_prescriptions_patient" ON "prescriptions"("patient_id");

-- CreateIndex
CREATE INDEX "idx_prescriptions_consultation" ON "prescriptions"("consultation_id");

-- CreateIndex
CREATE UNIQUE INDEX "promotions_promotion_code_key" ON "promotions"("promotion_code");

-- CreateIndex
CREATE INDEX "idx_promotions_active" ON "promotions"("is_active");

-- CreateIndex
CREATE INDEX "idx_promotions_branch" ON "promotions"("branch_id");

-- CreateIndex
CREATE INDEX "idx_promotions_code" ON "promotions"("promotion_code");

-- CreateIndex
CREATE INDEX "idx_promotions_dates" ON "promotions"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_prosthesis_orders_consultation" ON "prosthesis_orders"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_prosthesis_orders_dentist" ON "prosthesis_orders"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_prosthesis_orders_patient" ON "prosthesis_orders"("patient_id");

-- CreateIndex
CREATE INDEX "idx_public_form_submissions_date" ON "public_form_submissions"("submitted_at");

-- CreateIndex
CREATE INDEX "idx_public_form_submissions_form" ON "public_form_submissions"("public_form_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_forms_form_code_key" ON "public_forms"("form_code");

-- CreateIndex
CREATE INDEX "idx_public_forms_branch" ON "public_forms"("branch_id");

-- CreateIndex
CREATE INDEX "idx_public_forms_code" ON "public_forms"("form_code");

-- CreateIndex
CREATE INDEX "idx_radiography_requests_consultation" ON "radiography_requests"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_radiography_requests_data" ON "radiography_requests" USING GIN ("request_data");

-- CreateIndex
CREATE INDEX "idx_radiography_requests_date" ON "radiography_requests"("request_date");

-- CreateIndex
CREATE INDEX "idx_radiography_requests_dentist" ON "radiography_requests"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_radiography_requests_patient" ON "radiography_requests"("patient_id");

-- CreateIndex
CREATE INDEX "idx_radiography_results_request" ON "radiography_results"("radiography_request_id");

-- CreateIndex
CREATE INDEX "idx_radiography_results_status" ON "radiography_results"("status");

-- CreateIndex
CREATE INDEX "idx_radiography_results_type" ON "radiography_results"("result_type");

-- CreateIndex
CREATE INDEX "idx_radiography_results_uploader" ON "radiography_results"("uploaded_by");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_types_type_name_key" ON "reminder_types"("type_name");

-- CreateIndex
CREATE UNIQUE INDEX "reminder_types_type_code_key" ON "reminder_types"("type_code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name");

-- CreateIndex
CREATE INDEX "idx_roles_permissions_permission" ON "roles_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_roles_permissions_role" ON "roles_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uk_role_permission" ON "roles_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "idx_schedule_exceptions_date" ON "schedule_exceptions"("exception_date");

-- CreateIndex
CREATE INDEX "idx_schedule_exceptions_dentist" ON "schedule_exceptions"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_signed_consents_consultation" ON "signed_consents"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_signed_consents_patient" ON "signed_consents"("patient_id");

-- CreateIndex
CREATE INDEX "idx_signed_consents_template" ON "signed_consents"("consent_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_specialty_name_key" ON "specialties"("specialty_name");

-- CreateIndex
CREATE UNIQUE INDEX "tooth_positions_tooth_number_key" ON "tooth_positions"("tooth_number");

-- CreateIndex
CREATE UNIQUE INDEX "tooth_surfaces_surface_code_key" ON "tooth_surfaces"("surface_code");

-- CreateIndex
CREATE INDEX "idx_treatment_notes_appointment" ON "treatment_notes"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_treatment_notes_date" ON "treatment_notes"("note_date");

-- CreateIndex
CREATE INDEX "idx_treatment_notes_dentist" ON "treatment_notes"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_treatment_notes_patient" ON "treatment_notes"("patient_id");

-- CreateIndex
CREATE INDEX "idx_treatment_plan_procedures_plan" ON "treatment_plan_procedures"("treatment_plan_id");

-- CreateIndex
CREATE INDEX "idx_treatment_plan_procedures_procedure" ON "treatment_plan_procedures"("dental_procedure_id");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_plan_statuses_status_name_key" ON "treatment_plan_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_plan_statuses_status_code_key" ON "treatment_plan_statuses"("status_code");

-- CreateIndex
CREATE INDEX "idx_treatment_plans_date" ON "treatment_plans"("plan_date");

-- CreateIndex
CREATE INDEX "idx_treatment_plans_dentist" ON "treatment_plans"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_treatment_plans_patient" ON "treatment_plans"("patient_id");

-- CreateIndex
CREATE INDEX "idx_treatment_plans_status" ON "treatment_plans"("treatment_plan_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_statuses_status_name_key" ON "treatment_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "treatment_statuses_status_code_key" ON "treatment_statuses"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "treatments_treatment_code_key" ON "treatments"("treatment_code");

-- CreateIndex
CREATE INDEX "idx_treatments_pack_type" ON "treatments"("pack_type");

-- CreateIndex
CREATE UNIQUE INDEX "user_statuses_status_name_key" ON "user_statuses"("status_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_statuses_status_code_key" ON "user_statuses"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_branch" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_is_active" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_prescription_items_medication" ON "prescription_items"("medication_id");

-- CreateIndex
CREATE INDEX "idx_prescription_items_prescription" ON "prescription_items"("prescription_id");

-- CreateIndex
CREATE INDEX "idx_prescription_items_status" ON "prescription_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auxiliary_exam_results_consultation_id_key" ON "auxiliary_exam_results"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_auxiliary_exam_results_consultation" ON "auxiliary_exam_results"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_auxiliary_exam_results_dentist" ON "auxiliary_exam_results"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_auxiliary_exam_results_patient" ON "auxiliary_exam_results"("patient_id");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_condition" ON "definitive_diagnosis_conditions"("dental_condition_id");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_consultation" ON "definitive_diagnosis_conditions"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_presumptive" ON "definitive_diagnosis_conditions"("presumptive_condition_id");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_status" ON "definitive_diagnosis_conditions"("status");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_surfaces" ON "definitive_diagnosis_conditions" USING GIN ("surfaces");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_tooth" ON "definitive_diagnosis_conditions"("tooth_position_id");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_odontogram_condition" ON "definitive_diagnosis_conditions"("odontogram_condition_id");

-- CreateIndex
CREATE INDEX "idx_definitive_diagnosis_tooth_surface" ON "definitive_diagnosis_conditions"("tooth_surface_id");

-- CreateIndex
CREATE INDEX "idx_ddcs_definitive_condition" ON "definitive_diagnosis_condition_surfaces"("definitive_condition_id");

-- CreateIndex
CREATE INDEX "idx_ddcs_tooth_surface" ON "definitive_diagnosis_condition_surfaces"("tooth_surface_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ddcs_condition_surface" ON "definitive_diagnosis_condition_surfaces"("definitive_condition_id", "tooth_surface_id");

-- CreateIndex
CREATE INDEX "idx_treatment_condition_items_condition" ON "treatment_condition_items"("odontogram_condition_id");

-- CreateIndex
CREATE INDEX "idx_treatment_condition_items_order" ON "treatment_condition_items"("treatment_id", "display_order");

-- CreateIndex
CREATE INDEX "idx_treatment_condition_items_procedure" ON "treatment_condition_items"("condition_procedure_id");

-- CreateIndex
CREATE INDEX "idx_treatment_condition_items_status" ON "treatment_condition_items"("status");

-- CreateIndex
CREATE INDEX "idx_treatment_condition_items_treatment" ON "treatment_condition_items"("treatment_id");

-- CreateIndex
CREATE INDEX "idx_treatment_custom_items_category" ON "treatment_custom_items"("item_category");

-- CreateIndex
CREATE INDEX "idx_treatment_custom_items_order" ON "treatment_custom_items"("treatment_id", "display_order");

-- CreateIndex
CREATE INDEX "idx_treatment_custom_items_status" ON "treatment_custom_items"("status");

-- CreateIndex
CREATE INDEX "idx_treatment_custom_items_treatment" ON "treatment_custom_items"("treatment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_implant_plan_type" ON "implant_plans"("plan_type");

-- CreateIndex
CREATE INDEX "idx_implant_plans_status" ON "implant_plans"("status");

-- CreateIndex
CREATE INDEX "idx_implant_plans_type" ON "implant_plans"("plan_type");

-- CreateIndex
CREATE INDEX "idx_orthodontic_plans_status" ON "orthodontic_plans"("status");

-- CreateIndex
CREATE INDEX "idx_orthodontic_plans_type" ON "orthodontic_plans"("plan_type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_orthodontic_plan_type_modality" ON "orthodontic_plans"("plan_type", "plan_modality");

-- CreateIndex
CREATE INDEX "idx_prosthesis_items_order" ON "prosthesis_items"("display_order");

-- CreateIndex
CREATE INDEX "idx_prosthesis_items_status" ON "prosthesis_items"("status");

-- CreateIndex
CREATE INDEX "idx_cas_plan" ON "consultation_additional_services"("consultation_treatment_plan_id");

-- CreateIndex
CREATE INDEX "idx_cas_status" ON "consultation_additional_services"("status");

-- CreateIndex
CREATE INDEX "idx_cas_type" ON "consultation_additional_services"("service_type");

-- CreateIndex
CREATE INDEX "idx_cas_service_status" ON "consultation_additional_services"("service_status");

-- CreateIndex
CREATE INDEX "idx_ctic_item" ON "consultation_treatment_item_conditions"("consultation_treatment_item_id");

-- CreateIndex
CREATE INDEX "idx_ctic_status" ON "consultation_treatment_item_conditions"("status");

-- CreateIndex
CREATE INDEX "idx_cti_plan" ON "consultation_treatment_items"("consultation_treatment_plan_id");

-- CreateIndex
CREATE INDEX "idx_cti_status" ON "consultation_treatment_items"("status");

-- CreateIndex
CREATE INDEX "idx_cti_treatment" ON "consultation_treatment_items"("treatment_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_ctp_consultation" ON "consultation_treatment_plans"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_ctp_consultation" ON "consultation_treatment_plans"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_ctp_status" ON "consultation_treatment_plans"("status");

-- CreateIndex
CREATE INDEX "idx_ctp_treatment_plan" ON "consultation_treatment_plans"("treatment_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_budgets_consultation_id_key" ON "consultation_budgets"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_cb_consultation" ON "consultation_budgets"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_cb_date_registration" ON "consultation_budgets"("date_time_registration");

-- CreateIndex
CREATE INDEX "idx_cb_status" ON "consultation_budgets"("status");

-- CreateIndex
CREATE INDEX "idx_cb_promotion" ON "consultation_budgets"("promotion_id");

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_consultation" ON "evolution_odontogram"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_date" ON "evolution_odontogram"("registered_date" DESC);

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_dentist" ON "evolution_odontogram"("registered_by_dentist_id");

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_patient" ON "evolution_odontogram"("patient_id");

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_patient_tooth" ON "evolution_odontogram"("patient_id", "tooth_position_id");

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_status" ON "evolution_odontogram"("condition_status");

-- CreateIndex
CREATE INDEX "idx_evolution_odontogram_tooth" ON "evolution_odontogram"("tooth_position_id");

-- CreateIndex
CREATE INDEX "idx_procedure_history_consultation" ON "procedure_history"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_procedure_history_date" ON "procedure_history"("performed_date" DESC);

-- CreateIndex
CREATE INDEX "idx_procedure_history_dentist" ON "procedure_history"("performed_by_dentist_id");

-- CreateIndex
CREATE INDEX "idx_procedure_history_patient" ON "procedure_history"("patient_id");

-- CreateIndex
CREATE INDEX "idx_procedure_history_status" ON "procedure_history"("status");

-- CreateIndex
CREATE INDEX "idx_procedure_income_branch" ON "procedure_income"("branch_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_consultation" ON "procedure_income"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_date" ON "procedure_income"("performed_date" DESC);

-- CreateIndex
CREATE INDEX "idx_procedure_income_dentist" ON "procedure_income"("performed_by_dentist_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_dentist_date" ON "procedure_income"("performed_by_dentist_id", "performed_date");

-- CreateIndex
CREATE INDEX "idx_procedure_income_patient" ON "procedure_income"("patient_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_status" ON "procedure_income"("income_status");

-- CreateIndex
CREATE INDEX "idx_procedure_income_type" ON "procedure_income"("income_type");

-- CreateIndex
CREATE INDEX "idx_procedure_income_appointment" ON "procedure_income"("appointment_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_appointment_service" ON "procedure_income"("appointment_id", "parent_additional_service_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_parent_service" ON "procedure_income"("parent_additional_service_id");

-- CreateIndex
CREATE INDEX "idx_procedure_income_quota_type" ON "procedure_income"("quota_type");

-- CreateIndex
CREATE INDEX "idx_procedure_income_commission" ON "procedure_income"("commission_id");

-- CreateIndex
CREATE INDEX "idx_dentist_commissions_dentist" ON "dentist_commissions"("dentist_id");

-- CreateIndex
CREATE INDEX "idx_dentist_commissions_branch" ON "dentist_commissions"("branch_id");

-- CreateIndex
CREATE INDEX "idx_dentist_commissions_period" ON "dentist_commissions"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "idx_dentist_commissions_status" ON "dentist_commissions"("commission_status");

-- CreateIndex
CREATE INDEX "idx_dentist_commissions_dentist_period" ON "dentist_commissions"("dentist_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "idx_dentist_commissions_calculated_at" ON "dentist_commissions"("calculated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_smp_consultation" ON "service_monthly_payments"("consultation_id");

-- CreateIndex
CREATE INDEX "idx_smp_date" ON "service_monthly_payments"("payment_date" DESC);

-- CreateIndex
CREATE INDEX "idx_smp_dentist" ON "service_monthly_payments"("registered_by_dentist_id");

-- CreateIndex
CREATE INDEX "idx_smp_dentist_date" ON "service_monthly_payments"("registered_by_dentist_id", "payment_date");

-- CreateIndex
CREATE INDEX "idx_smp_patient" ON "service_monthly_payments"("patient_id");

-- CreateIndex
CREATE INDEX "idx_smp_service" ON "service_monthly_payments"("consultation_additional_service_id");

-- CreateIndex
CREATE INDEX "idx_smp_status" ON "service_monthly_payments"("status");

-- CreateIndex
CREATE INDEX "idx_smp_type" ON "service_monthly_payments"("payment_type");

-- CreateIndex
CREATE INDEX "idx_health_plan_dependents_active" ON "health_plan_dependents"("is_active");

-- CreateIndex
CREATE INDEX "idx_health_plan_dependents_patient" ON "health_plan_dependents"("patient_id");

-- CreateIndex
CREATE INDEX "idx_health_plan_dependents_relationship" ON "health_plan_dependents"("relationship");

-- CreateIndex
CREATE INDEX "idx_health_plan_dependents_status" ON "health_plan_dependents"("status");

-- CreateIndex
CREATE INDEX "idx_health_plan_dependents_subscription" ON "health_plan_dependents"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_plan_dependents_subscription_id_patient_id_key" ON "health_plan_dependents"("subscription_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "sub_procedures_sub_procedure_code_key" ON "sub_procedures"("sub_procedure_code");

-- CreateIndex
CREATE INDEX "idx_sub_procedures_active" ON "sub_procedures"("is_active");

-- CreateIndex
CREATE INDEX "idx_sub_procedures_code" ON "sub_procedures"("sub_procedure_code");

-- CreateIndex
CREATE INDEX "idx_sub_procedures_odontogram" ON "sub_procedures"("odontogram_condition_code");

-- CreateIndex
CREATE INDEX "idx_sub_procedures_specialty" ON "sub_procedures"("specialty");

-- CreateIndex
CREATE INDEX "idx_sub_procedures_status" ON "sub_procedures"("status");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_settings_benefit_code_key" ON "benefit_settings"("benefit_code");

-- CreateIndex
CREATE INDEX "idx_benefit_settings_code" ON "benefit_settings"("benefit_code");

-- CreateIndex
CREATE INDEX "idx_benefit_settings_status" ON "benefit_settings"("status");

-- CreateIndex
CREATE INDEX "idx_treatment_sub_procedure_items_sub_procedure" ON "treatment_sub_procedure_items"("sub_procedure_id");

-- CreateIndex
CREATE INDEX "idx_treatment_sub_procedure_items_treatment" ON "treatment_sub_procedure_items"("treatment_id");

-- CreateIndex
CREATE INDEX "idx_branch_payment_methods_active" ON "branch_payment_methods"("is_active");

-- CreateIndex
CREATE INDEX "idx_branch_payment_methods_branch" ON "branch_payment_methods"("branch_id");

-- CreateIndex
CREATE INDEX "idx_branch_payment_methods_type" ON "branch_payment_methods"("method_type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_radiography_request_active" ON "laboratory_external_payments"("radiography_request_id");

-- CreateIndex
CREATE INDEX "idx_lab_ext_payments_branch" ON "laboratory_external_payments"("branch_id");

-- CreateIndex
CREATE INDEX "idx_lab_ext_payments_request" ON "laboratory_external_payments"("radiography_request_id");

-- CreateIndex
CREATE INDEX "idx_lab_ext_payments_status" ON "laboratory_external_payments"("payment_status");

-- CreateIndex
CREATE INDEX "idx_patient_external_exams_patient" ON "patient_external_exams"("patient_id");

-- CreateIndex
CREATE INDEX "idx_patient_external_exams_status" ON "patient_external_exams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_purchases_purchase_code_key" ON "promotion_purchases"("purchase_code");

-- CreateIndex
CREATE INDEX "idx_promotion_purchases_code" ON "promotion_purchases"("purchase_code");

-- CreateIndex
CREATE INDEX "idx_promotion_purchases_date" ON "promotion_purchases"("date_time_registration" DESC);

-- CreateIndex
CREATE INDEX "idx_promotion_purchases_patient" ON "promotion_purchases"("patient_id");

-- CreateIndex
CREATE INDEX "idx_promotion_purchases_promotion" ON "promotion_purchases"("promotion_id");

-- CreateIndex
CREATE INDEX "idx_promotion_purchases_status" ON "promotion_purchases"("purchase_status");

-- CreateIndex
CREATE INDEX "idx_promotion_usages_date" ON "promotion_usages"("used_at");

-- CreateIndex
CREATE INDEX "idx_promotion_usages_patient" ON "promotion_usages"("patient_id");

-- CreateIndex
CREATE INDEX "idx_promotion_usages_promotion" ON "promotion_usages"("promotion_id");

-- CreateIndex
CREATE INDEX "idx_promotion_usages_promotion_patient" ON "promotion_usages"("promotion_id", "patient_id");

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "fk_app_settings_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "fk_appointment_reminders_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "fk_appointment_reminders_type" FOREIGN KEY ("reminder_type_id") REFERENCES "reminder_types"("reminder_type_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "fk_reschedule_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "fk_reschedule_approved_by" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "fk_reschedule_proposed_by" FOREIGN KEY ("proposed_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "fk_reschedule_rejected_by" FOREIGN KEY ("rejected_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "fk_history_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "fk_history_changed_by" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "fk_history_new_status" FOREIGN KEY ("new_status_id") REFERENCES "appointment_statuses"("appointment_status_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointment_status_history" ADD CONSTRAINT "fk_history_old_status" FOREIGN KEY ("old_status_id") REFERENCES "appointment_statuses"("appointment_status_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_cancelled_by" FOREIGN KEY ("cancelled_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_confirmed_by" FOREIGN KEY ("confirmed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_specialty" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("specialty_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "fk_appointments_status" FOREIGN KEY ("appointment_status_id") REFERENCES "appointment_statuses"("appointment_status_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_administrator" FOREIGN KEY ("administrator_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_company" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_details" ADD CONSTRAINT "fk_budget_details_budget" FOREIGN KEY ("budget_id") REFERENCES "budgets"("budget_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_details" ADD CONSTRAINT "fk_budget_details_definitive_condition" FOREIGN KEY ("definitive_condition_id") REFERENCES "definitive_diagnosis_conditions"("definitive_condition_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_details" ADD CONSTRAINT "fk_budget_details_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_details" ADD CONSTRAINT "fk_budget_details_procedure" FOREIGN KEY ("dental_procedure_id") REFERENCES "dental_procedures"("dental_procedure_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_details" ADD CONSTRAINT "fk_budget_details_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "fk_budgets_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "fk_budgets_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "fk_budgets_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "fk_budgets_status" FOREIGN KEY ("budget_status_id") REFERENCES "budget_statuses"("budget_status_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "fk_budgets_treatment_plan" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("treatment_plan_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_contracts" ADD CONSTRAINT "fk_company_contracts_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_contracts" ADD CONSTRAINT "fk_company_contracts_company" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_user_id_modification_fkey" FOREIGN KEY ("user_id_modification") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_user_id_registration_fkey" FOREIGN KEY ("user_id_registration") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_rooms" ADD CONSTRAINT "fk_consultation_rooms_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "fk_consultations_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "fk_consultations_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "fk_consultations_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "fk_consultations_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_schedules" ADD CONSTRAINT "fk_dentist_schedules_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_schedules" ADD CONSTRAINT "fk_dentist_schedules_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_specialties" ADD CONSTRAINT "dentist_specialties_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_specialties" ADD CONSTRAINT "dentist_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("specialty_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_specialties" ADD CONSTRAINT "dentist_specialties_user_id_modification_fkey" FOREIGN KEY ("user_id_modification") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_specialties" ADD CONSTRAINT "dentist_specialties_user_id_registration_fkey" FOREIGN KEY ("user_id_registration") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentists" ADD CONSTRAINT "fk_dentists_specialty" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("specialty_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentists" ADD CONSTRAINT "fk_dentists_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_conditions" ADD CONSTRAINT "fk_diagnostic_conditions_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_conditions" ADD CONSTRAINT "fk_diagnostic_conditions_diagnosis" FOREIGN KEY ("diagnosis_option_id") REFERENCES "diagnosis_options"("diagnosis_option_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_settings" ADD CONSTRAINT "fk_health_plan_settings_plan" FOREIGN KEY ("health_plan_id") REFERENCES "health_plans"("health_plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_subscriptions" ADD CONSTRAINT "fk_health_plan_subscriptions_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_subscriptions" ADD CONSTRAINT "fk_health_plan_subscriptions_plan" FOREIGN KEY ("health_plan_id") REFERENCES "health_plans"("health_plan_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_subscriptions" ADD CONSTRAINT "health_plan_subscriptions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_subscriptions" ADD CONSTRAINT "health_plan_subscriptions_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_terms" ADD CONSTRAINT "fk_health_plan_terms_plan" FOREIGN KEY ("health_plan_id") REFERENCES "health_plans"("health_plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_categories" ADD CONSTRAINT "fk_inventory_categories_parent" FOREIGN KEY ("parent_category_id") REFERENCES "inventory_categories"("inventory_category_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "fk_inventory_items_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "fk_inventory_items_category" FOREIGN KEY ("inventory_category_id") REFERENCES "inventory_categories"("inventory_category_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "fk_lab_results_request" FOREIGN KEY ("laboratory_request_id") REFERENCES "laboratory_requests"("laboratory_request_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "fk_laboratory_requests_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "fk_laboratory_requests_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "fk_laboratory_requests_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "fk_laboratory_requests_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "fk_medical_histories_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_condition_procedures" ADD CONSTRAINT "fk_condition_procedures_condition" FOREIGN KEY ("odontogram_condition_id") REFERENCES "odontogram_dental_conditions"("condition_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_conditions" ADD CONSTRAINT "fk_odontogram_conditions_dental_condition" FOREIGN KEY ("dental_condition_id") REFERENCES "odontogram_dental_conditions"("condition_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_conditions" ADD CONSTRAINT "fk_odontogram_conditions_odontogram" FOREIGN KEY ("odontogram_id") REFERENCES "odontograms"("odontogram_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_conditions" ADD CONSTRAINT "fk_odontogram_conditions_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_conditions" ADD CONSTRAINT "fk_odontogram_conditions_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_treatments" ADD CONSTRAINT "fk_odontogram_treatments_diagnosis" FOREIGN KEY ("diagnosis_option_id") REFERENCES "diagnosis_options"("diagnosis_option_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_treatments" ADD CONSTRAINT "fk_odontogram_treatments_odontogram" FOREIGN KEY ("odontogram_id") REFERENCES "odontograms"("odontogram_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_treatments" ADD CONSTRAINT "fk_odontogram_treatments_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_treatments" ADD CONSTRAINT "fk_odontogram_treatments_procedure" FOREIGN KEY ("dental_procedure_id") REFERENCES "dental_procedures"("dental_procedure_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_treatments" ADD CONSTRAINT "fk_odontogram_treatments_status" FOREIGN KEY ("treatment_status_id") REFERENCES "treatment_statuses"("treatment_status_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontogram_treatments" ADD CONSTRAINT "fk_odontogram_treatments_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "fk_odontograms_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "fk_odontograms_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "fk_odontograms_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "fk_odontograms_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "odontograms" ADD CONSTRAINT "fk_odontograms_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_contracts" ADD CONSTRAINT "fk_patient_contracts_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_contracts" ADD CONSTRAINT "fk_patient_contracts_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "fk_patient_documents_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "fk_patient_documents_type" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("document_type_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "fk_patient_documents_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_blood_type" FOREIGN KEY ("blood_type_id") REFERENCES "blood_types"("blood_type_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_company" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_gender" FOREIGN KEY ("gender_id") REFERENCES "genders"("gender_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_identification_type" FOREIGN KEY ("identification_type_id") REFERENCES "identification_types"("identification_type_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_marital_status" FOREIGN KEY ("marital_status_id") REFERENCES "marital_statuses"("marital_status_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "fk_patients_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "fk_payment_vouchers_issued_by" FOREIGN KEY ("issued_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "fk_payment_vouchers_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("payment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_budget" FOREIGN KEY ("budget_id") REFERENCES "budgets"("budget_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_method" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("payment_method_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_received_by" FOREIGN KEY ("received_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "income_payments" ADD CONSTRAINT "fk_income_payments_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("payment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "income_payments" ADD CONSTRAINT "fk_income_payments_procedure_income" FOREIGN KEY ("procedure_income_id") REFERENCES "procedure_income"("income_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "income_payments" ADD CONSTRAINT "fk_income_payments_user" FOREIGN KEY ("applied_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "fk_prescriptions_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "fk_prescriptions_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "fk_prescriptions_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "fk_prescriptions_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "fk_prescriptions_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "fk_promotions_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prosthesis_orders" ADD CONSTRAINT "fk_prosthesis_orders_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prosthesis_orders" ADD CONSTRAINT "fk_prosthesis_orders_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prosthesis_orders" ADD CONSTRAINT "fk_prosthesis_orders_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prosthesis_orders" ADD CONSTRAINT "fk_prosthesis_orders_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public_form_submissions" ADD CONSTRAINT "fk_public_form_submissions_form" FOREIGN KEY ("public_form_id") REFERENCES "public_forms"("public_form_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public_form_submissions" ADD CONSTRAINT "fk_public_form_submissions_processed_by" FOREIGN KEY ("processed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public_forms" ADD CONSTRAINT "fk_public_forms_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_requests" ADD CONSTRAINT "fk_radiography_requests_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_requests" ADD CONSTRAINT "fk_radiography_requests_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_requests" ADD CONSTRAINT "fk_radiography_requests_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_requests" ADD CONSTRAINT "fk_radiography_requests_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_requests" ADD CONSTRAINT "fk_radiography_requests_performed_by" FOREIGN KEY ("performed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_results" ADD CONSTRAINT "fk_radiography_results_request" FOREIGN KEY ("radiography_request_id") REFERENCES "radiography_requests"("radiography_request_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "radiography_results" ADD CONSTRAINT "fk_radiography_results_uploader" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "fk_roles_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "fk_roles_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "fk_schedule_exceptions_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "fk_schedule_exceptions_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signed_consents" ADD CONSTRAINT "fk_signed_consents_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signed_consents" ADD CONSTRAINT "fk_signed_consents_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signed_consents" ADD CONSTRAINT "fk_signed_consents_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "signed_consents" ADD CONSTRAINT "fk_signed_consents_template" FOREIGN KEY ("consent_template_id") REFERENCES "consent_templates"("consent_template_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_notes" ADD CONSTRAINT "fk_treatment_notes_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_notes" ADD CONSTRAINT "fk_treatment_notes_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_notes" ADD CONSTRAINT "fk_treatment_notes_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_notes" ADD CONSTRAINT "fk_treatment_notes_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plan_procedures" ADD CONSTRAINT "fk_treatment_plan_procedures_plan" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("treatment_plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plan_procedures" ADD CONSTRAINT "fk_treatment_plan_procedures_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plan_procedures" ADD CONSTRAINT "fk_treatment_plan_procedures_procedure" FOREIGN KEY ("dental_procedure_id") REFERENCES "dental_procedures"("dental_procedure_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plan_procedures" ADD CONSTRAINT "fk_treatment_plan_procedures_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "fk_treatment_plans_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "fk_treatment_plans_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "fk_treatment_plans_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "fk_treatment_plans_status" FOREIGN KEY ("treatment_plan_status_id") REFERENCES "treatment_plan_statuses"("treatment_plan_status_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "fk_prescription_items_medication" FOREIGN KEY ("medication_id") REFERENCES "medications"("medication_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "fk_prescription_items_prescription" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("prescription_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auxiliary_exam_results" ADD CONSTRAINT "auxiliary_exam_results_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auxiliary_exam_results" ADD CONSTRAINT "auxiliary_exam_results_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auxiliary_exam_results" ADD CONSTRAINT "auxiliary_exam_results_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_dental_condition" FOREIGN KEY ("dental_condition_id") REFERENCES "odontogram_dental_conditions"("condition_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_odontogram_condition" FOREIGN KEY ("odontogram_condition_id") REFERENCES "odontogram_conditions"("condition_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_presumptive" FOREIGN KEY ("presumptive_condition_id") REFERENCES "diagnostic_conditions"("diagnostic_condition_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_selected_procedure" FOREIGN KEY ("selected_procedure_id") REFERENCES "odontogram_condition_procedures"("condition_procedure_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_tooth_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_conditions" ADD CONSTRAINT "fk_definitive_diagnosis_tooth_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_condition_surfaces" ADD CONSTRAINT "fk_ddcs_definitive_condition" FOREIGN KEY ("definitive_condition_id") REFERENCES "definitive_diagnosis_conditions"("definitive_condition_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "definitive_diagnosis_condition_surfaces" ADD CONSTRAINT "fk_ddcs_tooth_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_condition_items" ADD CONSTRAINT "fk_treatment_condition_items_condition" FOREIGN KEY ("odontogram_condition_id") REFERENCES "odontogram_dental_conditions"("condition_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_condition_items" ADD CONSTRAINT "fk_treatment_condition_items_procedure" FOREIGN KEY ("condition_procedure_id") REFERENCES "odontogram_condition_procedures"("condition_procedure_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_condition_items" ADD CONSTRAINT "fk_treatment_condition_items_treatment" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("treatment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_custom_items" ADD CONSTRAINT "fk_treatment_custom_items_treatment" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("treatment_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "consultation_additional_services_completion_income_id_fkey" FOREIGN KEY ("completion_income_id") REFERENCES "procedure_income"("income_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "fk_cas_completed_dentist" FOREIGN KEY ("service_completed_by_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "fk_cas_implant" FOREIGN KEY ("implant_plan_id") REFERENCES "implant_plans"("implant_plan_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "fk_cas_initial_income" FOREIGN KEY ("initial_payment_income_id") REFERENCES "procedure_income"("income_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "fk_cas_orthodontic" FOREIGN KEY ("orthodontic_plan_id") REFERENCES "orthodontic_plans"("orthodontic_plan_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "fk_cas_plan" FOREIGN KEY ("consultation_treatment_plan_id") REFERENCES "consultation_treatment_plans"("consultation_treatment_plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_additional_services" ADD CONSTRAINT "fk_cas_prosthesis" FOREIGN KEY ("prosthesis_item_id") REFERENCES "prosthesis_items"("prosthesis_item_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_treatment_item_conditions" ADD CONSTRAINT "fk_ctic_definitive_condition" FOREIGN KEY ("definitive_condition_id") REFERENCES "definitive_diagnosis_conditions"("definitive_condition_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_treatment_item_conditions" ADD CONSTRAINT "fk_ctic_item" FOREIGN KEY ("consultation_treatment_item_id") REFERENCES "consultation_treatment_items"("consultation_treatment_item_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_treatment_items" ADD CONSTRAINT "fk_cti_plan" FOREIGN KEY ("consultation_treatment_plan_id") REFERENCES "consultation_treatment_plans"("consultation_treatment_plan_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_treatment_items" ADD CONSTRAINT "fk_cti_treatment" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("treatment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_treatment_plans" ADD CONSTRAINT "fk_ctp_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_treatment_plans" ADD CONSTRAINT "fk_ctp_treatment_plan" FOREIGN KEY ("treatment_plan_id") REFERENCES "treatment_plans"("treatment_plan_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_budgets" ADD CONSTRAINT "fk_cb_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consultation_budgets" ADD CONSTRAINT "fk_cb_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_dentist" FOREIGN KEY ("registered_by_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_history" FOREIGN KEY ("procedure_history_id") REFERENCES "procedure_history"("procedure_history_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_income" FOREIGN KEY ("income_id") REFERENCES "procedure_income"("income_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_tooth_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evolution_odontogram" ADD CONSTRAINT "fk_evolution_odontogram_tooth_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "fk_procedure_history_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "fk_procedure_history_definitive_condition" FOREIGN KEY ("definitive_condition_id") REFERENCES "definitive_diagnosis_conditions"("definitive_condition_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "fk_procedure_history_dentist" FOREIGN KEY ("performed_by_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "fk_procedure_history_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "fk_procedure_history_tooth_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_history" ADD CONSTRAINT "fk_procedure_history_tooth_surface" FOREIGN KEY ("tooth_surface_id") REFERENCES "tooth_surfaces"("tooth_surface_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_commission" FOREIGN KEY ("commission_id") REFERENCES "dentist_commissions"("commission_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_dentist" FOREIGN KEY ("performed_by_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_history" FOREIGN KEY ("procedure_history_id") REFERENCES "procedure_history"("procedure_history_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_parent_service" FOREIGN KEY ("parent_additional_service_id") REFERENCES "consultation_additional_services"("consultation_additional_service_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "fk_procedure_income_tooth_position" FOREIGN KEY ("tooth_position_id") REFERENCES "tooth_positions"("tooth_position_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "procedure_income_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "procedure_income" ADD CONSTRAINT "procedure_income_voucher_payment_method_id_fkey" FOREIGN KEY ("voucher_payment_method_id") REFERENCES "payment_methods"("payment_method_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_commissions" ADD CONSTRAINT "fk_dentist_commissions_approved_by" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_commissions" ADD CONSTRAINT "fk_dentist_commissions_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_commissions" ADD CONSTRAINT "fk_dentist_commissions_calculated_by" FOREIGN KEY ("calculated_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_commissions" ADD CONSTRAINT "fk_dentist_commissions_dentist" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_commissions" ADD CONSTRAINT "fk_dentist_commissions_paid_by" FOREIGN KEY ("paid_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dentist_commissions" ADD CONSTRAINT "fk_dentist_commissions_rejected_by" FOREIGN KEY ("rejected_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_monthly_payments" ADD CONSTRAINT "fk_smp_additional_service" FOREIGN KEY ("consultation_additional_service_id") REFERENCES "consultation_additional_services"("consultation_additional_service_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_monthly_payments" ADD CONSTRAINT "fk_smp_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_monthly_payments" ADD CONSTRAINT "fk_smp_consultation" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("consultation_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_monthly_payments" ADD CONSTRAINT "fk_smp_dentist" FOREIGN KEY ("registered_by_dentist_id") REFERENCES "dentists"("dentist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_monthly_payments" ADD CONSTRAINT "fk_smp_income" FOREIGN KEY ("income_id") REFERENCES "procedure_income"("income_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_monthly_payments" ADD CONSTRAINT "fk_smp_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_dependents" ADD CONSTRAINT "health_plan_dependents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "health_plan_dependents" ADD CONSTRAINT "health_plan_dependents_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "health_plan_subscriptions"("subscription_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_sub_procedure_items" ADD CONSTRAINT "treatment_sub_procedure_items_sub_procedure_id_fkey" FOREIGN KEY ("sub_procedure_id") REFERENCES "sub_procedures"("sub_procedure_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "treatment_sub_procedure_items" ADD CONSTRAINT "treatment_sub_procedure_items_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("treatment_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "branch_payment_methods" ADD CONSTRAINT "fk_branch_payment_methods_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_external_payments" ADD CONSTRAINT "laboratory_external_payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("branch_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_external_payments" ADD CONSTRAINT "laboratory_external_payments_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_external_payments" ADD CONSTRAINT "laboratory_external_payments_radiography_request_id_fkey" FOREIGN KEY ("radiography_request_id") REFERENCES "radiography_requests"("radiography_request_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "laboratory_external_payments" ADD CONSTRAINT "laboratory_external_payments_set_price_by_user_id_fkey" FOREIGN KEY ("set_price_by_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_external_exams" ADD CONSTRAINT "patient_external_exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_purchases" ADD CONSTRAINT "fk_promotion_purchases_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("appointment_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_purchases" ADD CONSTRAINT "fk_promotion_purchases_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_purchases" ADD CONSTRAINT "fk_promotion_purchases_payment_method" FOREIGN KEY ("payment_method_id") REFERENCES "branch_payment_methods"("payment_method_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_purchases" ADD CONSTRAINT "fk_promotion_purchases_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_purchases" ADD CONSTRAINT "fk_promotion_purchases_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "fk_promotion_usages_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("patient_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "fk_promotion_usages_promotion" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_usages" ADD CONSTRAINT "fk_promotion_usages_user" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

