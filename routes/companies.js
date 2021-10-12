const express = require("express");
const slugify = require("slugify");
const ExpressError = require("../expressError")
const db = require("../db");

let router = new express.Router();


// Routes Needed
// GET / companies
// Returns list of companies, like { companies: [{ code, name }, { code, name }] }

router.get("/", async (req, res, next) => {
    try {
        const result = await db.query(`SELECT code, name FROM companies ORDER BY name`);
        return res.json({ "companies": result.rows });
    } catch (err) {
        return next(err);
    }
});


// GET / companies / [code]
// Return obj of company: { company: { code, name, description } }
// Update
// Return obj of company: {company: {code, name, description, invoices: [id, ...]}}
// If the company given cannot be found, this should return a 404 status response.

router.get("/:code", async (req, res, next) => {
    try {
        const { code } = req.params;

        const compResult = await db.query(
            `SELECT * FROM companies
             WHERE code = $1`,
            [code]
        );

        const invResult = await db.query(
            `SELECT id
            FROM invoices
            WHERE comp_code = $1`,
            [code]
        );
        // If the company given cannot be found, this should return a 404 status response.

        if (compResult.rows.length === 0) {
            throw new ExpressError(`No such company: ${code}`, 404)
        }

        const company = compResult.rows[0];
        const invoices = invResult.rows;

        company.invoices = invoices.map(inv => inv.id);

        return res.json({ "company": company });
    } catch (err) {
        return next(err);
    }
});

// POST / companies
// Adds a company.
// Needs to be given JSON like: { code, name, description }
// Returns obj of new company: { company: { code, name, description } }


router.post("/", async (req, res, next) => {
    try {
        const { code, name, description } = req.body;
        const slugCode = slugify(code, { lower: true });

        const result = await db.query(
            `INSERT INTO companies (code, name, description) 
           VALUES ($1, $2, $3) 
           RETURNING code, name, description`,
            [slugCode, name, description]);

        return res.status(201).json({ "company": result.rows[0] });
    }

    catch (err) {
        return next(err);
    }
});



// PUT / companies / [code]
// Edit existing company.
// Should return 404 if company cannot be found.
// Needs to be given JSON like: { name, description }
// Returns update company object: { company: { code, name, description } }

router.put('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;
        const { name, description } = req.body;
        const results = await db.query(
            `UPDATE companies SET name=$1, description=$2 WHERE code=$3 
            RETURNING code, name, description`,
            [name, description, code])

        if (results.rows.length === 0) {
            throw new ExpressError(`Can't update user with id of ${id}`, 404)
        } else {
            return res.json({ "company": result.rows[0] });
        }
        // return res.send({ "company": results.rows[0] })
    } catch (e) {
        return next(e)
    }
})

// DELETE / companies / [code]
// Deletes company.
// Should return 404 if company cannot be found.
// Returns { status: "deleted" }

router.delete('/:code', async (req, res, next) => {
    try {
        const { code } = req.params;

        const results = await db.query('DELETE FROM companies WHERE code=$1 RETURNING code', [req.params.code])
        if (results.rows.length === 0) {
            throw new ExpressError(`No company: ${code} found`, 404)
        } else {
            return res.json({ "status": "deleted" });
        }

    } catch (e) {
        return next(e)
    }
})

module.exports = router;
