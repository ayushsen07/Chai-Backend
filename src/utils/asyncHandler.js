const asyncHandler = (requestHandler) =>{
    (req, res, next)=>{
        Promise.resolve(requestHandler(req, res, next))
        .catch((err)=>next(err))
    }

}





export {asyncHandler}


/*
 this functon is only for checking all time request its true or not. like we write mant time try catch for handle error so for ease we make a function and this function we use everwhere where the needed
*/