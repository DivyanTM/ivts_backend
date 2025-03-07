const router = require("express").Router();
const {getStaffCountByHighestQualification}=require('../controllers/DashboardController');
const {getStaffsCountByCourses, getDesignationCountsInOrganizations, getSalaryHikes, getHighestAndLowestHikes,
    getTotalManpowerDeployed, getManningCost, getStaffsCountByDesignation
} = require("../controllers/DashBoardController");

router.get('/staffs/hq', getStaffCountByHighestQualification);
router.get('/staffs/courses', getStaffsCountByCourses);
router.get('/staffs/organisation',getDesignationCountsInOrganizations);
router.get('/hike',getSalaryHikes);
router.get('/hike/hl',getHighestAndLowestHikes);
router.get('/manpower/count',getTotalManpowerDeployed);
router.get('/manningcost',getManningCost);
router.get('/staffs/designation',getStaffsCountByDesignation);

module.exports = {DashBoardRouter: router};