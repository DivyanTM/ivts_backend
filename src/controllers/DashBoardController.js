const {sql,getPool}=require('../config/dbconfig');
const res = require("express/lib/response");


let pool;

(
    async()=>{
        try{
            pool = await getPool();
        }catch(err){
            console.error(err);
            res.status(500).json({ message: err.message || "Internal Server Error" });
        }
    }
)();

async function getStaffCountByHighestQualification(req, res){
    try{

        const request=await pool.request();

        const query= `
                                SELECT count(s.staff_id) AS [count],q.highest_qualification AS qualification
                                FROM tbl_staff s
                                RIGHT JOIN mmt_highest_qualification q on
                                s.highest_qualification=q.qual_id
                                GROUP BY(q.highest_qualification);
        
        `;

        const result = await request.query(query);
        if(result.recordset.length > 0){
            return res.status(200).json({result:result.recordset});
        }
        return res.status(404).json({result:[]});
    }catch(err){
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}



async function getStaffsCountByCourses(req,res){
    try{
        const request=await pool.request();
        const query=`
                                SELECT COUNT(s.staff_id) AS [count],c.course_name AS course
                                FROM tbl_staff s
                                RIGHT JOIN mmt_courses c ON
                                s.courses=c.course_id
                                GROUP BY(c.course_name);
        
        `;
        const result = await request.query(query);
        if(result.recordset.length > 0){
            return res.status(200).json({result:result.recordset});
        }
        return res.status(404).json({result:"Not Found"});
    }catch(err){
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}

async function getDesignationCountsInOrganizations(req, res) {
    try {
        const request = await pool.request();

        const query = `
      WITH LatestContractLogs AS (
          SELECT 
            c.emp_id,
            c.current_designation,
            c.contract_start_date,
            ROW_NUMBER() OVER (PARTITION BY c.emp_id ORDER BY c.contract_start_date DESC) AS rn
          FROM tbl_contract_logs c
      )
      SELECT 
        o.organisation_name AS organisation,
        d.designation,
        COUNT(s.staff_id) AS [count]
      FROM mmt_organisation o
      LEFT JOIN tbl_staff s ON s.location_of_work = o.org_id
      LEFT JOIN LatestContractLogs lcl ON s.staff_id = lcl.emp_id AND lcl.rn = 1
      LEFT JOIN mmt_designation d ON lcl.current_designation = d.des_id
      GROUP BY o.organisation_name, d.designation
      ORDER BY o.organisation_name;
    `;

        const result = await request.query(query);

        const grouped = {};

        const designationSet = new Set();


        result.recordset.forEach(item => {

            const orgKey = item.organisation;


            if (!grouped[orgKey]) {
                grouped[orgKey] = {};
            }


            if (item.designation !== null) {
                grouped[orgKey][item.designation] = item.count;
                designationSet.add(item.designation);
            }
        });

        let chartData = [];
        const allDesignations = Array.from(designationSet);
        if(allDesignations.length > 0){
            chartData = Object.keys(grouped).map(orgKey => {
                const entry = { entity: orgKey };

                allDesignations.forEach(designation => {

                    // const key = designation;
                    // .split(" ")
                    // .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1))
                    // .join("");
                    entry[designation] = grouped[orgKey][designation];
                });
                return entry;
            });
            return res.status(200).json({ result: chartData });
        }


        return res.status(404).json({result:[]});

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}


async function getSalaryHikes(req,res){
    try{
        const request=await pool.request();
        const query=`
                WITH LatestContractLogs AS (
          SELECT 
            c.emp_id,
            c.contract_start_date,
c.gross_pay,
            ROW_NUMBER() OVER (PARTITION BY c.emp_id ORDER BY c.contract_start_date DESC) AS rn
          FROM tbl_contract_logs c
)
select
  (abs(l.gross_pay-s.salary_at_joining)/s.salary_at_joining)*100 as [hike]
from tbl_staff s
left join LatestContractLogs l on
l.emp_id=s.staff_id AND l.rn=1 order by hike desc;
        
        `;
        let hikes=[];

        const result=await request.query(query);
        if(result.recordset.length > 0){
            const data=result.recordset;
            data.map((item)=>{
                hikes.push(item.hike);
            })
            return res.status(200).json({hikes});
        }else{
            return res.status(404).json({result:"Not Found"});
        }
    }catch(err){
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}

async function getHighestAndLowestHikes(req,res){
    try{
        const request=await pool.request();
        const query=`
                            WITH LatestContractLogs AS (
    SELECT 
        c.emp_id,
        c.contract_start_date,
        c.gross_pay,
        ROW_NUMBER() OVER (PARTITION BY c.emp_id ORDER BY c.contract_start_date DESC) AS rn
    FROM tbl_contract_logs c
)
SELECT staff_name, organisation, hike FROM (
    SELECT TOP 1 
        s.staff_name,
        o.organisation_name AS organisation,
        (ABS(l.gross_pay - s.salary_at_joining) / s.salary_at_joining) * 100 AS [hike]
    FROM tbl_staff s
    LEFT JOIN LatestContractLogs l ON l.emp_id = s.staff_id AND l.rn = 1
    LEFT JOIN mmt_organisation o ON o.org_id = s.location_of_work
    ORDER BY [hike] DESC 
) AS HighestHike

UNION ALL

SELECT staff_name, organisation, hike FROM (
    SELECT TOP 1 
        s.staff_name,
        o.organisation_name AS organisation,
        (ABS(l.gross_pay - s.salary_at_joining) / s.salary_at_joining) * 100 AS [hike]
    FROM tbl_staff s
    LEFT JOIN LatestContractLogs l ON l.emp_id = s.staff_id AND l.rn = 1
    LEFT JOIN mmt_organisation o ON o.org_id = s.location_of_work
    ORDER BY [hike] ASC 
) AS LowestHike;


        `;
    const response = await request.query(query);
    if(response.recordset.length > 0){
        return res.status(200).json({result:response.recordset});
    }
    return res.status(404).json({result:"Not Found"});
    }catch(err){
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}

async function getTotalManpowerDeployed(req,res){
    try{
        const request=await pool.request();
        const query=`
                            select count(distinct staff_id) as count from tbl_staff;
        `;

        const result=await request.query(query);
        if(result.recordset.length > 0){
            return res.status(200).json({count:result.recordset[0].count});
        }
        return res.status(404).json({result:"Not Found"});
    }catch(err){
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}


async function getManningCost(req,res){
    try{
        const request=await pool.request();
        const query=`
                                     WITH LatestContractLogs AS (
          SELECT 
            c.emp_id,
            c.current_designation,
            c.contract_start_date,
            c.gross_pay,
            ROW_NUMBER() OVER (PARTITION BY c.emp_id ORDER BY c.contract_start_date DESC) AS rn
          FROM tbl_contract_logs c
      )
      SELECT 
        o.organisation_name AS organisation,
        sum(lcl.gross_pay) as manningCost
      FROM mmt_organisation o
      LEFT JOIN tbl_staff s ON s.location_of_work = o.org_id
      LEFT JOIN LatestContractLogs lcl ON s.staff_id = lcl.emp_id AND lcl.rn = 1
      GROUP BY o.organisation_name;
        
        `;


        const response = await request.query(query);
        if(response.recordset.length > 0){
            const data=response.recordset;
            data.forEach((item)=>{
                if(!item.manningCost){
                    item.manningCost=0;
                }
            })
            return res.status(200).json({result:data});
        }
        return res.status(404).json({result:"Not Found"});
    }catch(err){
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}


async function getStaffsCountByDesignation(req, res) {
    try {
        const request = await pool.request();

        const query = `
            WITH LatestContractLogs AS (
                SELECT
                    c.emp_id,
                    c.current_designation,
                    c.contract_start_date,
                    ROW_NUMBER() OVER (PARTITION BY c.emp_id ORDER BY c.contract_start_date DESC) AS rn
                FROM tbl_contract_logs c
            )
            SELECT
                d.designation,
                ISNULL(COUNT(s.staff_id), 0) AS [count]
            FROM mmt_organisation o
                     LEFT JOIN tbl_staff s ON s.location_of_work = o.org_id
                     LEFT JOIN LatestContractLogs lcl ON s.staff_id = lcl.emp_id AND lcl.rn = 1
                     LEFT JOIN mmt_designation d ON lcl.current_designation = d.des_id
            GROUP BY d.designation;
        `;

        const response = await request.query(query);
        if (response.recordset.length > 0) {
            const filteredData = response.recordset.filter(item => item.designation);

            // console.log(filteredData);
            return res.status(200).json({ result: filteredData });
        }
    
        return res.status(404).json({ result: "Not Found" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message || "Internal Server Error" });
    }
}


module.exports = {
    getStaffCountByHighestQualification,
    getStaffsCountByCourses,
    getDesignationCountsInOrganizations,
    getSalaryHikes,
    getHighestAndLowestHikes,
    getTotalManpowerDeployed,
    getManningCost,
    getStaffsCountByDesignation
}