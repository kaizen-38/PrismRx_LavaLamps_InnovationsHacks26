"""Initial schema migration.

Revision ID: 001
Revises: 
Create Date: 2026-04-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial tables."""
    
    # Create payers table
    op.create_table(
        'payers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(50), nullable=False),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('color_hex', sa.String(7), nullable=False),
        sa.Column('website_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug'),
    )
    op.create_index('ix_payers_id', 'payers', ['id'])
    op.create_index('ix_payers_name', 'payers', ['name'])
    op.create_index('ix_payers_slug', 'payers', ['slug'])
    op.create_index('ix_payers_is_active', 'payers', ['is_active'])
    
    # Create drugs table
    op.create_table(
        'drugs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('brand_name', sa.String(100), nullable=False),
        sa.Column('generic_name', sa.String(200), nullable=False),
        sa.Column('j_code', sa.String(10), nullable=True),
        sa.Column('ndc_codes', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('therapeutic_area', sa.String(100), nullable=False),
        sa.Column('mechanism', sa.String(200), nullable=True),
        sa.Column('fda_approved_indications', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_drugs_id', 'drugs', ['id'])
    op.create_index('ix_drugs_brand_name', 'drugs', ['brand_name'])
    op.create_index('ix_drugs_generic_name', 'drugs', ['generic_name'])
    op.create_index('ix_drugs_j_code', 'drugs', ['j_code'], unique=True)
    op.create_index('ix_drugs_therapeutic_area', 'drugs', ['therapeutic_area'])
    op.create_index('ix_drugs_is_active', 'drugs', ['is_active'])
    
    # Create policy_documents table
    op.create_table(
        'policy_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('policy_number', sa.String(50), nullable=True),
        sa.Column('effective_date', sa.DateTime(), nullable=False),
        sa.Column('expiry_date', sa.DateTime(), nullable=True),
        sa.Column('pdf_storage_path', sa.String(500), nullable=False),
        sa.Column('pdf_hash', sa.String(64), nullable=False),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('parsing_status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('parsed_at', sa.DateTime(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_policy_documents_id', 'policy_documents', ['id'])
    op.create_index('ix_policy_documents_payer_id', 'policy_documents', ['payer_id'])
    op.create_index('ix_policy_documents_pdf_hash', 'policy_documents', ['pdf_hash'], unique=True)
    op.create_index('ix_policy_documents_parsing_status', 'policy_documents', ['parsing_status'])
    
    # Create coverage_policies table (core Policy DNA)
    op.create_table(
        'coverage_policies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('drug_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('indication', sa.String(200), nullable=False),
        sa.Column('coverage_status', sa.String(50), nullable=False),
        sa.Column('prior_auth_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('step_therapy_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('step_therapy_drugs', postgresql.JSONB(), nullable=True),
        sa.Column('quantity_limits', postgresql.JSONB(), nullable=True),
        sa.Column('age_restrictions', postgresql.JSONB(), nullable=True),
        sa.Column('clinical_criteria', sa.Text(), nullable=False),
        sa.Column('criteria_structured', postgresql.JSONB(), nullable=True),
        sa.Column('reauth_interval_months', sa.Integer(), nullable=True),
        sa.Column('peer_to_peer_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('effective_date', sa.DateTime(), nullable=False),
        sa.Column('source_page_numbers', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_coverage_policies_id', 'coverage_policies', ['id'])
    op.create_index('ix_coverage_policies_drug_id', 'coverage_policies', ['drug_id'])
    op.create_index('ix_coverage_policies_payer_id', 'coverage_policies', ['payer_id'])
    op.create_index('ix_coverage_policies_document_id', 'coverage_policies', ['document_id'])
    op.create_index('ix_coverage_policies_indication', 'coverage_policies', ['indication'])
    op.create_index('ix_coverage_policies_coverage_status', 'coverage_policies', ['coverage_status'])


def downgrade() -> None:
    """Drop tables on downgrade."""
    op.drop_index('ix_coverage_policies_coverage_status', table_name='coverage_policies')
    op.drop_index('ix_coverage_policies_indication', table_name='coverage_policies')
    op.drop_index('ix_coverage_policies_document_id', table_name='coverage_policies')
    op.drop_index('ix_coverage_policies_payer_id', table_name='coverage_policies')
    op.drop_index('ix_coverage_policies_drug_id', table_name='coverage_policies')
    op.drop_index('ix_coverage_policies_id', table_name='coverage_policies')
    op.drop_table('coverage_policies')
    
    op.drop_index('ix_policy_documents_parsing_status', table_name='policy_documents')
    op.drop_index('ix_policy_documents_pdf_hash', table_name='policy_documents')
    op.drop_index('ix_policy_documents_payer_id', table_name='policy_documents')
    op.drop_index('ix_policy_documents_id', table_name='policy_documents')
    op.drop_table('policy_documents')
    
    op.drop_index('ix_drugs_is_active', table_name='drugs')
    op.drop_index('ix_drugs_therapeutic_area', table_name='drugs')
    op.drop_index('ix_drugs_j_code', table_name='drugs')
    op.drop_index('ix_drugs_generic_name', table_name='drugs')
    op.drop_index('ix_drugs_brand_name', table_name='drugs')
    op.drop_index('ix_drugs_id', table_name='drugs')
    op.drop_table('drugs')
    
    op.drop_index('ix_payers_is_active', table_name='payers')
    op.drop_index('ix_payers_slug', table_name='payers')
    op.drop_index('ix_payers_name', table_name='payers')
    op.drop_index('ix_payers_id', table_name='payers')
    op.drop_table('payers')
