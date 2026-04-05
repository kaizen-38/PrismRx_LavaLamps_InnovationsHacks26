"""Database seed script for sample data."""

import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SyncSessionLocal
from app.models import Drug, Payer, CoveragePolicyDNA

# Sample payers matching the hackathon requirements
SAMPLE_PAYERS = [
    {
        "name": "Aetna",
        "slug": "aetna",
        "color_hex": "#7B2D8E",
        "website_url": "https://www.aetna.com",
    },
    {
        "name": "Cigna",
        "slug": "cigna",
        "color_hex": "#E8601C",
        "website_url": "https://www.cigna.com",
    },
    {
        "name": "UnitedHealthcare",
        "slug": "uhc",
        "color_hex": "#002677",
        "website_url": "https://www.uhcprovider.com",
    },
    {
        "name": "Blue Cross Blue Shield IL",
        "slug": "bcbs-il",
        "color_hex": "#0072CE",
        "website_url": "https://www.bcbsil.com",
    },
]

# Sample drugs for immunology/inflammation focus
SAMPLE_DRUGS = [
    {
        "brand_name": "Remicade",
        "generic_name": "infliximab",
        "j_code": "J1745",
        "therapeutic_area": "Immunology",
        "mechanism": "TNF Inhibitor",
    },
    {
        "brand_name": "Entyvio",
        "generic_name": "vedolizumab",
        "j_code": "J3380",
        "therapeutic_area": "Immunology",
        "mechanism": "Anti-integrin",
    },
    {
        "brand_name": "Ocrevus",
        "generic_name": "ocrelizumab",
        "j_code": "J2350",
        "therapeutic_area": "Neurology",
        "mechanism": "Anti-CD20 mAb",
    },
    {
        "brand_name": "Orencia",
        "generic_name": "abatacept",
        "j_code": "J0129",
        "therapeutic_area": "Immunology",
        "mechanism": "CTLA4-Ig fusion protein",
    },
    {
        "brand_name": "Simponi Aria",
        "generic_name": "golimumab",
        "j_code": "J1602",
        "therapeutic_area": "Immunology",
        "mechanism": "TNF Inhibitor",
    },
    {
        "brand_name": "Actemra",
        "generic_name": "tocilizumab",
        "j_code": "J3262",
        "therapeutic_area": "Immunology",
        "mechanism": "Anti-IL-6 receptor",
    },
    {
        "brand_name": "Taltz",
        "generic_name": "ixekizumab",
        "j_code": "J1757",
        "therapeutic_area": "Immunology",
        "mechanism": "Anti-IL-17A mAb",
    },
    {
        "brand_name": "Cosentyx",
        "generic_name": "secukinumab",
        "j_code": "J2357",
        "therapeutic_area": "Immunology",
        "mechanism": "Anti-IL-17A mAb",
    },
    {
        "brand_name": "Stelara",
        "generic_name": "ustekinumab",
        "j_code": "J3358",
        "therapeutic_area": "Immunology",
        "mechanism": "IL-12/23 Inhibitor",
    },
    {
        "brand_name": "Rituxan",
        "generic_name": "rituximab",
        "j_code": "J9312",
        "therapeutic_area": "Immunology",
        "mechanism": "Anti-CD20 mAb",
    },
    {
        "brand_name": "Cimzia",
        "generic_name": "certolizumab_pegol",
        "j_code": "J0717",
        "therapeutic_area": "Immunology",
        "mechanism": "PEG-TNF Inhibitor",
    },
    {
        "brand_name": "Olumiant",
        "generic_name": "baricitinib",
        "j_code": "J2892",
        "therapeutic_area": "Immunology",
        "mechanism": "JAK1/2 Inhibitor",
    },
]


def seed_database():
    """Seed database with sample data."""
    db = SyncSessionLocal()
    try:
        # Check if data already exists
        existing_payers = db.query(Payer).count()
        if existing_payers > 0:
            print("Database already seeded. Skipping...")
            return
        
        print("Seeding payers...")
        payers = []
        for payer_data in SAMPLE_PAYERS:
            payer = Payer(
                id=uuid.uuid4(),
                **payer_data,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(payer)
            payers.append(payer)
        
        db.commit()
        print(f"✓ Created {len(payers)} payers")
        
        print("Seeding drugs...")
        drugs = []
        for drug_data in SAMPLE_DRUGS:
            drug = Drug(
                id=uuid.uuid4(),
                **drug_data,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(drug)
            drugs.append(drug)
        
        db.commit()
        print(f"✓ Created {len(drugs)} drugs")
        
        print("Seeding sample coverage policies...")
        # Create some sample coverage relationships
        coverage_count = 0
        for drug in drugs[:12]:  # All 12 drugs
            for payer in payers[:4]:  # All 4 payers
                # Randomly assign coverage status based on drug and payer
                import random
                statuses = ["covered", "covered_with_restrictions", "not_covered"]
                coverage_status = random.choice(statuses)
                
                policy = CoveragePolicyDNA(
                    id=uuid.uuid4(),
                    drug_id=drug.id,
                    payer_id=payer.id,
                    document_id=uuid.uuid4(),  # Stub document ID
                    indication="Primary indication",
                    coverage_status=coverage_status,
                    prior_auth_required=random.choice([True, False]),
                    step_therapy_required=random.choice([True, False]),
                    clinical_criteria="Standard clinical criteria apply",
                    effective_date=datetime.utcnow(),
                    confidence_score=0.85,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(policy)
                coverage_count += 1
        
        db.commit()
        print(f"✓ Created {coverage_count} coverage policies")
        
        print("\n✓ Database seeding completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
